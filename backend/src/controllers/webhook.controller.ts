import { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../database/models';
import { logger } from '../utils/logger';

/**
 * Circle Webhook Handler- Critical Payment Flow Component
 * Handles on-chain settlement notifications from Circle
 * POST /api/webhooks/circle
 */

/**
 * Verifica la firma del webhook de Circle
 * https://developers.circle.com/api/webhooks#verify-signature
 */
function verifyCircleSignature(payload: any, signature: string, secret: string): boolean {
 const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(payload));
 const expectedSignature = hmac.digest('hex');
  
  // Timing-safe comparison to prevent timing attacks
 return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Handler principal para webhooks de Circle
 */
export const handleCircleWebhook = async (req: Request, res: Response): Promise<void> => {
 const signature = req.headers['x-circle-signature'] as string;
 const payload = req.body;
  
  // 1. Verify signature (CRITICAL: reject if invalid)
  if (!signature || !verifyCircleSignature(payload, signature, process.env.CIRCLE_WEBHOOK_SECRET!)) {
    logger.warn('Webhook signature verification failed', { 
      signature: signature?.substring(0, 10) + '...',
      ip: req.ip 
    });
   res.status(401).json({ error: 'Invalid signature' });
   return;
  }

  // 2. Verify idempotency (prevent duplicate processing)
 const eventId = payload.event?.id;
  if (!eventId) {
    logger.error('Webhook missing event.id', { payload });
   res.status(400).json({ error: 'Missing event.id' });
   return;
  }

 const alreadyProcessed = await db.payments.findOne({ circleEventId: eventId });
  if (alreadyProcessed) {
    logger.info('Webhook already processed (idempotent)', { eventId });
   res.status(200).json({ received: true, duplicate: true });
   return;
  }

  // 3. Process according to event type
  try {
   const { event } = payload;
    
    switch (event.type) {
     case 'payment.settled':
       await handlePaymentSettled(event.data);
        break;
        
     case 'payment.confirmed':
       await handlePaymentConfirmed(event.data);
        break;
        
     case 'payment.failed':
       await handlePaymentFailed(event.data);
        break;
        
     case 'wallet.created':
       await handleWalletCreated(event.data);
        break;
        
     default:
        logger.info('Unhandled Circle event type', { type: event.type });
    }

    // 4. Mark as processed (idempotency)
   await db.payments.updateOne(
      { transactionId: event.data?.transactionId },
      { $set: { circleEventId: eventId, webhookProcessedAt: new Date() } }
    );

    logger.info('Webhook processed successfully', { eventId, type: event.type });
   res.status(200).json({ received: true });

  } catch (error) {
    logger.error('Webhook processing failed', {error, eventId, payload });
    
    // Circle will retry if we respond with 5xx
   res.status(500).json({ error: 'Internal processing error' });
  }
};

/**
 * Evento: payment.settled
 * Payment settled on-chain → activate permanent access
 */
async function handlePaymentSettled(data: any): Promise<void> {
 const { transactionId, amount, asset, walletAddress } = data;
  
  logger.info('Payment settled', { transactionId, amount, asset });

  // 1. Update payment in DB
 const payment = await db.payments.findOneAndUpdate(
    { transactionId },
    { 
      $set: { 
       status: 'settled',
        settledAt: new Date(),
        onChainTxHash: data.onChainTxHash,
        settledAmount: amount,
        settledAsset: asset
      } 
    }
  );

  if (!payment) {
    logger.warn('Payment not found for settled event', { transactionId });
   return;
  }

  // 2. If VM associated, extend access
  if (payment.vmId) {
   await extendVMAccess(payment.vmId, payment);
  }

  // 3. If subscription, renew certificate
  if (payment.subscriptionType === 'subscription') {
   await renewSubscriptionCertificate(payment);
  }

  // 4. Notify user (optional: email, push, etc.)
  await notifyUser(payment.userId, {
    type: 'payment_settled',
    amount,
    asset,
   resource: payment.resource
  });
}

/**
 * Evento: payment.confirmed
 * Payment confirmed off-chain → immediate temporary access
 */
async function handlePaymentConfirmed(data: any): Promise<void> {
 const { transactionId, certificateId } = data;
  
  logger.info('Payment confirmed', { transactionId, certificateId });

  await db.payments.updateOne(
    { transactionId },
    { $set: { status: 'confirmed', confirmedAt: new Date() } }
  );

  // Immediate access if there's pending certificate
  if (certificateId) {
   const cert = await db.paymentCertificates.findOne({ certificateId });
    if (cert && cert.status === 'pending') {
     await activateCertificate(cert);
    }
  }
}

/**
 * Evento: payment.failed
 * Payment failed → revoke pending access
 */
async function handlePaymentFailed(data: any): Promise<void> {
 const { transactionId, failureReason } = data;
  
  logger.warn('Payment failed', { transactionId, reason: failureReason });

 const payment = await db.payments.findOneAndUpdate(
    { transactionId },
    { $set: { status: 'failed', failedAt: new Date(), failureReason } }
  );

  if (!payment) return;

  // Revoke access if it was pending and has VM
  if (payment.status === 'pending' && payment.vmId) {
   await revokeVMAccess(payment.vmId, 'payment_failed');
  }

  // Notify user
  await notifyUser(payment.userId, {
    type: 'payment_failed',
   reason: failureReason,
    action: 'retry_or_contact_support'
  });
}

/**
 * Evento: wallet.created
 * New wallet created for user → save reference
 */
async function handleWalletCreated(data: any): Promise<void> {
 const { walletId, address, blockchain, userId } = data.meta || {};
  
  if (!userId) return; // Wallet without associated user

  logger.info('Wallet created', { walletId, address, blockchain });

  await db.users.updateOne(
    { id: userId },
    { 
      $set: { 
        circleWalletId: walletId,
        walletAddress: address,
        walletBlockchain: blockchain,
        walletCreatedAt: new Date()
      } 
    }
  );
}

/**
 * Extend VM access when payment settles
 */
async function extendVMAccess(vmId: string, payment: any): Promise<void> {
 const vm = await db.vms.findOne({ vmId });
  if (!vm) return;

  // Extend expiry based on payment duration
 const extensionHours = calculateDurationFromAmount(payment.settledAmount, payment.resource);
 const newExpiry = new Date(Date.now() + extensionHours * 60 * 60 * 1000);

  await db.vms.updateOne(
    { vmId },
    { 
      $set: { 
       expiresAt: newExpiry,
        lastPaymentAt: new Date(),
       status: 'running' // Ensure it's active
      },
      $push: { paymentHistory: payment._id}
    }
  );

  logger.info('VM access extended', { vmId, newExpiry, hours: extensionHours });
}

/**
 * Renew subscription certificate
 */
async function renewSubscriptionCertificate(payment: any): Promise<void> {
  // Generate new certificate for next cycle
 const circleGateway = require('../payments/circle-gateway').circleGateway;
  
 const newCert = await circleGateway.certifyPayment(
   payment.userId,
   payment.settledAmount,
   payment.resource
  );

  await db.paymentCertificates.updateOne(
    { userId: payment.userId, resource: payment.resource },
    {
      $set: {
        certificateId: newCert.certificateId,
       expiresAt: newCert.expiresAt,
       status: 'active',
        lastRenewedAt: new Date()
      }
    }
  );

  logger.info('Subscription certificate renewed', { userId: payment.userId, newCert });
}

/**
 * Activate pending certificate → provision resource
 */
async function activateCertificate(cert: any): Promise<void> {
  if (!cert || cert.status !== 'pending') return;

  // Provision associated resource
  if (cert.resourceType === 'vm') {
   const azureManager= require('../infrastructure/azure-manager').azureManager;
    
   const vm = await azureManager.provisionVM({
      userId: cert.userId,
      vmSize: cert.resourceSpecs?.vmSize || 'Standard_B2s',
     region: cert.resourceSpecs?.region || 'eastus',
      duration: cert.durationHours || 24,
     resource: cert.resource
    });

    // Link VM with certificate
   await db.paymentCertificates.updateOne(
      { _id: cert._id },
      {
        $set: { 
         status: 'active', 
         provisionedVmId: vm.vmId,
          activatedAt: new Date()
        }
      }
    );

    // Notify user with credentials
   await notifyUser(cert.userId, {
      type: 'vm_provisioned',
      vmId: vm.vmId,
      accessEndpoint: vm.accessEndpoint,
      credentials: vm.credentials // Encrypted, only user can decrypt
    });
  }
}

/**
 * Revoke VM access due to failed payment
 */
async function revokeVMAccess(vmId: string, reason: string): Promise<void> {
  try {
   const azureManager= require('../infrastructure/azure-manager').azureManager;
    
    // Deallocate VM (not delete: allows resume if pays later)
   await azureManager.deallocateVM(vmId);
    
   await db.vms.updateOne(
      { vmId },
      { 
        $set: { 
         status: 'deallocated',
         deallocatedAt: new Date(),
         deallocateReason: reason
        } 
      }
    );

    logger.info('VM access revoked', { vmId, reason });
  } catch (error) {
    logger.error('Failed to revoke VM access', { vmId, error });
  }
}

/**
 * Notify user (placeholder for email/push integration)
 */
async function notifyUser(userId: string, notification: any): Promise<void> {
  // TODO: Integrate with notification service (SendGrid, Firebase, etc.)
  
  logger.info('User notification queued', { 
    userId, 
    type: notification.type,
    // Don't log sensitive data
    summary: JSON.stringify({ type: notification.type, action: notification.action })
  });

  // Optional: Store in notifications collection for frontend polling
  // await db.notifications.insertOne({ userId, ...notification, read: false });
}

/**
 * Calculate duration in hours based on paid amount and resource
 * (Reverse pricing logic)
 */
function calculateDurationFromAmount(amount: string, resource: string): number {
 const amounts: Record<string, number> = {
    'vm-gpu-small': 0.30,   // $0.30/hour
    'vm-gpu-medium': 0.75,  // $0.75/hour
    'vm-cpu-small': 0.02,   // $0.02/hour
    'storage-10gb': 0.20,   // $0.20/month → ~$0.0003/hour
  };

 const ratePerHour = amounts[resource] || 0.30; // Default
 const paidAmount = parseFloat(amount);
  
  // Minimum 1 hour, maximum 72 hours per payment
 return Math.max(1, Math.min(72, Math.floor(paidAmount / ratePerHour)));
}
