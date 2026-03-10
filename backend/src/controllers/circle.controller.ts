import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { circleGateway } from '../payments/circle-gateway';
import { db } from '../database/models';

/**
 * Circle Payment Controller - x402 Protocol Implementation
 * Handles payment initiation, verification, and certification
 */

export const circleController= {
  /**
   * Initiate a payment for resource subscription
   * POST /api/payments/initiate
   */
  initiatePayment: async (req: Request, res: Response): Promise<any> => {
  try {
    const { userId, amount, resource, subscriptionType } = req.body;

      // Validate input
     if (!userId || !amount || !resource) {
       return res.status(400).json({ error: 'Missing required fields' });
      }

      // Generate payment details for signature
    const nonce = Date.now();
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour
    const transactionId = `tx_${nonce}`;

    const paymentDetails = {
        amount,
       resource,
        subscriptionType: subscriptionType || 'one-time',
        nonce,
       deadline,
       recipient: process.env.CIRCLE_RECIPIENT_ADDRESS!
      };

      // Store pending payment in DB
     await db.payments.insertOne({
      transactionId,
        userId,
        amount,
       resource,
        subscriptionType,
       status: 'pending',
        nonce,
        createdAt: new Date()
      });

     res.json({
        success: true,
      paymentDetails,
      message: 'Please sign the payment with your wallet'
      });
    } catch (error) {
    console.error('Initiate payment error:', error);
     res.status(500).json({ error: 'Failed to initiate payment' });
    }
  },

  /**
   * Verify payment signature and complete transaction
   * POST /api/payments/verify
   */
  verifyPayment: async (req: Request, res: Response): Promise<any> => {
   try {
     const { signature, paymentDetails } = req.body;

      if (!signature || !paymentDetails) {
        return res.status(400).json({ error: 'Missing signature or payment details' });
      }

      // Verify payment using Circle Gateway
     const verification = await circleGateway.verifyPayment(signature, paymentDetails);

      if (!verification.valid) {
        return res.status(400).json({ 
          error: 'Invalid payment signature',
          valid: false 
        });
      }

      // Update payment status in DB
      await db.payments.updateOne(
        { nonce: paymentDetails.nonce },
        { 
          $set: { 
            status: 'completed',
           transactionId: verification.transactionId,
            signerAddress: verification.signerAddress,
           verifiedAt: new Date()
          }
        }
      );

      // Issue payment certificate
     const certification = await circleGateway.certifyPayment(
       paymentDetails.subscriptionType === 'subscription' ? 'subscription-access' : 'one-time-access',
       paymentDetails.amount,
       paymentDetails.resource
      );

      res.json({
        success: true,
        valid: true,
       transactionId: verification.transactionId,
        certificateId: certification.certificateId,
        expiresAt: certification.expiresAt,
       message: 'Payment verified successfully'
      });
    } catch (error) {
     console.error('Verify payment error:', error);
      res.status(500).json({ error: 'Failed to verify payment' });
    }
  },

  /**
   * Get payment certificate
   * GET /api/payments/certificate/:id
   */
  getCertificate: async (req: Request, res: Response): Promise<any> => {
   try {
     const { id } = req.params;

     const certificate = await db.paymentCertificates.findOne({ certificateId: id });

      if (!certificate) {
        return res.status(404).json({ error: 'Certificate not found' });
      }

      // Check if expired
      if (certificate.status === 'active' && new Date() > certificate.expiresAt) {
        await db.paymentCertificates.updateOne(
          { certificateId: id },
          { $set: { status: 'expired' } }
        );
        certificate.status = 'expired';
      }

      res.json({
        success: true,
        certificate
      });
    } catch (error) {
     console.error('Get certificate error:', error);
      res.status(500).json({ error: 'Failed to retrieve certificate' });
    }
  },

  /**
   * Get user's payment history
   * GET /api/payments/history/:userId
   */
  getPaymentHistory: async (req: Request, res: Response) => {
   try {
     const { userId } = req.params;

     const payments = await db.payments.find({ userId }).sort({ createdAt: -1 }).toArray();

      res.json({
        success: true,
       count: payments.length,
       payments
      });
    } catch (error) {
     console.error('Get payment history error:', error);
      res.status(500).json({ error: 'Failed to retrieve payment history' });
    }
  },

  /**
   * Get active subscriptions for user
   * GET /api/payments/subscriptions/:userId
   */
  getSubscriptions: async (req: Request, res: Response) => {
   try {
     const { userId } = req.params;

     const subscriptions = await db.payments.find({
        userId,
        subscriptionType: 'subscription',
        status: 'completed'
      }).sort({ createdAt: -1 }).toArray();

      // Filter only active (non-expired) subscriptions
     const active = subscriptions.filter(sub => {
       const certificate = db.paymentCertificates.findOne({ 
          userId: sub.userId,
          resource: sub.resource 
        });
        return certificate && certificate.status === 'active';
      });

      res.json({
        success: true,
        total: subscriptions.length,
        active: active.length,
        subscriptions
      });
    } catch (error) {
     console.error('Get subscriptions error:', error);
      res.status(500).json({ error: 'Failed to retrieve subscriptions' });
    }
  },

  /**
   * Cancel subscription
   * POST /api/payments/subscriptions/:id/cancel
   */
  cancelSubscription: async (req: Request, res: Response): Promise<any> => {
  try {
   const { id} = req.params;

      // Convert string id to ObjectId
   const objectId = new ObjectId(id);

      // Mark subscription as cancelled
    await db.payments.updateOne(
       { _id: objectId },
       { $set: { status: 'cancelled', cancelledAt: new Date() } }
      );

      // Deactivate certificate
   const payment = await db.payments.findOne({ _id: objectId });
      if (payment) {
        await db.paymentCertificates.updateMany(
          { userId: payment.userId, resource: payment.resource },
          { $set: { status: 'cancelled' } }
        );
      }

      res.json({
        success: true,
       message: 'Subscription cancelled successfully'
      });
    } catch (error) {
     console.error('Cancel subscription error:', error);
      res.status(500).json({ error: 'Failed to cancel subscription' });
    }
  }
};
