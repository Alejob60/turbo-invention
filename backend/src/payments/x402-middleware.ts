import { Request, Response, NextFunction } from 'express';
import { circleGateway, PaymentDetails } from './circle-gateway';

export interface PaymentRequirement {
 resource: string;
  amount: string;
  asset: string;
  network: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
   id: string;
   email: string;
   wallet?: string;
    activePaymentCertificate?: string;
  };
}

/**
 * x402 Payment Required Middleware
 * Verifies payment signatures and manages payment certificates
 */
export const x402Middleware = (requirements: PaymentRequirement[]) => {
 return async (
   req: AuthenticatedRequest,
   res: Response,
    next: NextFunction
  ) => {
    try {
      // Check if user already has valid payment certificate
    const existingCert = req.user?.activePaymentCertificate;
      if (existingCert) {
      const isValid = await circleGateway.validateCertificate(existingCert);
        if (isValid) {
       console.log('✅ Valid payment certificate found:', existingCert);
        return next();
        }
      }

      // Check for x402 payment headers
    const paymentSignature = req.headers['x-payment-signature'] as string;
    const paymentDetailsHeader= req.headers['x-payment-details'] as string;

      if (!paymentSignature || !paymentDetailsHeader) {
        // No payment provided - return 402 Payment Required
      res.set('Payment-Required', 'true');
      res.set('Accept-Payment', JSON.stringify(requirements));
      res.set('X-Payment-Endpoint', '/api/payments/initiate');
        
      return res.status(402).json({
         error: 'Payment Required',
          message: 'Este recurso requiere pago previo',
         paymentRequirements: requirements,
          instructions: {
           step1: 'Firma autorización EIP-3009 con tu wallet',
           step2: 'Incluye signature en header X-Payment-Signature',
           step3: 'Incluye detalles en header X-Payment-Details',
           step4: 'Reenvía la request'
          }
        });
      }

      // Parse payment details
     let paymentDetails: PaymentDetails;
      try {
      paymentDetails = JSON.parse(paymentDetailsHeader);
      } catch (error) {
      return res.status(400).json({
         error: 'Invalid Payment Details',
          message: 'El formato de los detalles de pago no es válido'
        });
      }

      // Verify payment with Circle Gateway
    const verification = await circleGateway.verifyPayment(
       paymentSignature,
       paymentDetails
      );

      if (!verification.valid) {
      return res.status(402).json({
         error: 'Payment Verification Failed',
          message: 'La firma o el saldo no son válidos',
          signerAddress: verification.signerAddress
        });
      }

      // Certify payment for this resource
    const userId = req.user?.id;
      if (!userId) {
      return res.status(401).json({
         error: 'Unauthorized',
          message: 'Usuario no autenticado'
        });
      }

    const certification = await circleGateway.certifyPayment(
        userId,
       requirements[0].amount,
       requirements[0].resource
      );

      // Store certificate ID in user session for future requests
      if (req.user) {
       req.user.activePaymentCertificate = certification.certificateId;
      }

     console.log('✅ Payment certified:', certification.certificateId);
      
      next();
    } catch (error) {
   console.error('x402 middleware error:', error);
    return res.status(500).json({
       error: 'Payment Processing Error',
        message: 'Error procesando el pago'
      });
    }
  };
};

/**
 * Optional payment middleware - doesn't require payment but tracks it
 */
export const optionalPaymentMiddleware = async (
 req: AuthenticatedRequest,
 res: Response,
  next: NextFunction
) => {
  try {
    // Try to extract and verify payment if present
  const paymentSignature = req.headers['x-payment-signature'] as string;
  const paymentDetailsHeader= req.headers['x-payment-details'] as string;

    if (paymentSignature && paymentDetailsHeader) {
    const paymentDetails: PaymentDetails = JSON.parse(paymentDetailsHeader);
    const verification = await circleGateway.verifyPayment(
       paymentSignature,
       paymentDetails
      );

      if (verification.valid && req.user) {
      const certification = await circleGateway.certifyPayment(
         req.user.id,
         paymentDetails.amount,
        paymentDetails.resource
        );
      req.user.activePaymentCertificate = certification.certificateId;
      }
    }

    next();
  } catch (error) {
  console.error('Optional payment middleware error:', error);
    // Don't fail the request - just continue without payment
    next();
  }
};
