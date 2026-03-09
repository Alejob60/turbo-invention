import { Request, Response } from 'express';
import { circleGateway } from './circle-gateway';

/**
 * Handle Circle webhook events
 * Endpoint: POST /api/payments/webhook
 */
export const handleCircleWebhook = async (req: Request, res: Response) => {
  try {
    // Verify webhook signature (Circle sends X-Circle-Signature header)
  const signature = req.headers['x-circle-signature'] as string;
    
    if (!signature) {
   console.warn('⚠️ Webhook received without signature');
      // In production, verify signature with Circle public key
    return res.status(401).json({ error: 'Missing webhook signature' });
    }

    // TODO: Implement signature verification
    // const isValid = await verifyWebhookSignature(req.body, signature);
    // if (!isValid) return res.status(401).json({ error: 'Invalid signature' });

  const event = req.body;
  console.log('📬 Circle webhook received:', event.type);

    // Process the webhook event
  await circleGateway.handleWebhook(event);

    // Acknowledge receipt
  res.status(200).json({ received: true });
  } catch (error) {
  console.error('Webhook processing error:', error);
  res.status(500).json({ 
    error: 'Webhook processing failed',
     message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Initiate payment flow
 * Endpoint: POST /api/payments/initiate
 */
export const initiatePayment = async (req: Request, res: Response) => {
  try {
  const { userId, amount, resource } = req.body;

    if (!userId || !amount || !resource) {
   return res.status(400).json({
      error: 'Missing required fields',
        message: 'userId, amount, and resource are required'
      });
    }

    // Check if user has wallet, create if not
   // TODO: Get user wallet from request (authenticated)
  const walletAddress = req.headers['x-wallet-address'] as string;
    
    if (!walletAddress) {
    // Create new wallet for user
  const wallet = await circleGateway.createWallet(userId, 'human');
   return res.status(201).json({
       action: 'wallet_created',
      wallet,
       nextStep: 'Fund wallet with USDC on Base network'
      });
    }

    // Generate payment details for signing
  const paymentDetails = {
     amount,
 resource,
     nonce: Date.now(),
     recipient: process.env.CIRCLE_RECIPIENT_ADDRESS || '0x...',
      deadline: Math.floor(Date.now() / 1000) + 3600 // 1 hour
    };

  res.json({
      action: 'sign_payment',
     paymentDetails,
      instructions: {
       step1: 'Sign this data with your wallet using EIP-712',
       step2: 'Send signature in X-Payment-Signature header',
       step3: 'Send paymentDetails in X-Payment-Details header'
      }
    });
  } catch (error) {
  console.error('Payment initiation error:', error);
  res.status(500).json({
    error: 'Payment initiation failed',
     message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

/**
 * Get payment certificate status
 * Endpoint: GET /api/payments/certificate/:id
 */
export const getCertificateStatus = async (req: Request, res: Response) => {
  try {
   const { id } = req.params;
    
    // Handle potential array from params
   const certificateId = Array.isArray(id) ? id[0] : id;
   const isValid = await circleGateway.validateCertificate(certificateId);
    
  res.json({
      certificateId: id,
      valid: isValid,
      status: isValid ? 'active' : 'expired_or_used'
    });
  } catch (error) {
  console.error('Certificate status error:', error);
  res.status(500).json({
    error: 'Certificate lookup failed',
     message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
