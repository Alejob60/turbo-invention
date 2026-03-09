import { ethers } from 'ethers';
import { db, PaymentCertificate, Wallet } from '../database/models';

export interface PaymentDetails {
  amount: string;
 resource: string;
  nonce: number;
 recipient: string;
  deadline: number;
}

export interface PaymentVerification {
  valid: boolean;
  transactionId?: string;
  signerAddress?: string;
}

export interface PaymentCertification {
  certified: boolean;
  certificateId: string;
  expiresAt: Date;
}

export class CircleGateway {
  private provider: ethers.Provider;
  private walletSigner?: ethers.Wallet;

  constructor() {
    // Initialize with Base Mainnet(chainId: 8453)
  const rpcUrl = process.env.RPC_URL || 'https://base-mainnet.g.alchemy.com/v2/';
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Optional: Initialize wallet for on-chain operations
    if (process.env.PRIVATE_KEY) {
     this.walletSigner = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
    }
  }

  /**
   * Create a wallet for user/agent using Circle Developer API
   * Note: This requires Circle API credentials
   */
  async createWallet(userId: string, type: 'human' | 'agent'): Promise<{
   walletId: string;
    address: string;
  }> {
    try {
      // TODO: Integrate with Circle Developer Controlled Wallets API
      // For now, we'll generate a deterministic address from userId
     const hash = ethers.keccak256(ethers.toUtf8Bytes(`${userId}-${type}`));
     const wallet = new ethers.Wallet(hash);

     const walletData: Wallet = {
       walletId: `wallet-${userId}-${Date.now()}`,
        address: wallet.address,
        userId,
        type,
        blockchain: 'BASE-MAINNET',
        createdAt: new Date()
      };

     await db.wallets.insertOne(walletData);

     return {
       walletId: walletData.walletId,
        address: walletData.address
      };
    } catch (error) {
    console.error('Error creating wallet:', error);
      throw new Error('Failed to create wallet');
    }
  }

  /**
   * Verify x402 payment signature (EIP-3009 style transferWithAuthorization)
   * This is off-chain verification - no gas cost
   */
  async verifyPayment(
    signature: string,
   paymentDetails: PaymentDetails
  ): Promise<PaymentVerification> {
    try {
      // Recover signer address from signature
     const signerAddress = ethers.verifyTypedData(
        {
          name: 'Circle Gateway',
          version: '1',
          chainId: 8453, // Base Mainnet
          verifyingContract: paymentDetails.recipient
        },
        {
          PaymentAuthorization: [
            { name: 'amount', type: 'uint256' },
            { name: 'resource', type: 'string' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' }
          ]
        },
       paymentDetails,
        signature
      );

      // Check if nonce has been used (prevent replay attacks)
     const nonceUsed = await this.isNonceUsed(signerAddress, paymentDetails.nonce);
      if (nonceUsed) {
      console.warn('Nonce reuse detected:', signerAddress, paymentDetails.nonce);
       return { valid: false };
      }

      // TODO: Check USDC balance (requires Circle API or on-chain check)
      // For now, we trust the signature as proof of funds
     const balanceOk = true; // Placeholder - implement actual balance check
      if (!balanceOk) {
       return { valid: false };
      }

      // Mark nonce as used
     await this.markNonceUsed(signerAddress, paymentDetails.nonce);

      // Generate unique transaction ID
     const transactionId = `${signerAddress}-${paymentDetails.nonce}`;

     return {
        valid: true,
        transactionId,
        signerAddress
      };
    } catch (error) {
    console.error('Payment verification failed:', error);
     return { valid: false };
    }
  }

  /**
   * Certify payment for resource access
   * Creates time-limited certificate that grants access to resources
   */
  async certifyPayment(
    userId: string,
    amount: string,
 resource: string
  ): Promise<PaymentCertification> {
    // Generate unique certificate ID
   const certificateId = ethers.keccak256(
      ethers.defaultAbiCoder.encode(
        ['string', 'string', 'uint256', 'uint256'],
        [userId, resource, amount, Date.now()]
      )
    );

   const expiresAt = new Date(Date.now() + 3600000); // 1 hour validity

   const certificate: PaymentCertificate = {
      certificateId,
      userId,
      amount,
 resource,
      status: 'active',
      createdAt: new Date(),
      expiresAt
    };

   await db.paymentCertificates.insertOne(certificate);

   return {
      certified: true,
      certificateId,
      expiresAt
    };
  }

  /**
   * Validate existing payment certificate
   */
  async validateCertificate(certificateId: string): Promise<boolean> {
    try {
     const certificate = await db.paymentCertificates.findOne({ certificateId });
      
      if (!certificate) {
       return false;
      }

      // Check if expired
      if (new Date() > certificate.expiresAt) {
       await db.paymentCertificates.updateOne(
          { certificateId },
          { $set: { status: 'expired' } }
        );
       return false;
      }

      // Check if already used
      if (certificate.status === 'used') {
       return false;
      }

     return certificate.status === 'active';
    } catch (error) {
    console.error('Certificate validation error:', error);
     return false;
    }
  }

  /**
   * Mark certificate as used after resource provisioning
   */
  async useCertificate(certificateId: string): Promise<void> {
   await db.paymentCertificates.updateOne(
      { certificateId },
      { $set: { status: 'used' } }
    );
  }

  /**
   * Handle Circle webhook events
   */
  async handleWebhook(event: any): Promise<void> {
    try {
    console.log('Processing Circle webhook:', event.type);

      switch (event.type) {
        case 'payment.settled':
         await this.handlePaymentSettled(event.data);
          break;
        case 'payment.failed':
         await this.handlePaymentFailed(event.data);
          break;
        default:
        console.log('Unhandled webhook event type:', event.type);
      }
    } catch (error) {
    console.error('Webhook handling error:', error);
      throw error;
    }
  }

  private async handlePaymentSettled(data: any): Promise<void> {
  console.log('Payment settled:', data.transactionId);
    
    // Update payment status in database
   await db.payments.updateOne(
      { transactionId: data.transactionId },
      { 
        $set: { 
          status: 'settled',
          settledAt: new Date()
        }
      }
    );

    // TODO: Notify resource allocation system
  }

  private async handlePaymentFailed(data: any): Promise<void> {
  console.log('Payment failed:', data.transactionId);
    
   await db.payments.updateOne(
      { transactionId: data.transactionId },
      { $set: { status: 'failed' } }
    );

    // TODO: Notify user and revoke access if needed
  }

  /**
   * Check if nonce has been used (prevent replay attacks)
   */
  private async isNonceUsed(address: string, nonce: number): Promise<boolean> {
   const record = await db.nonces.findOne({ address, nonce });
   return record !== null;
  }

  /**
   * Mark nonce as used
   */
  private async markNonceUsed(address: string, nonce: number): Promise<void> {
   await db.nonces.insertOne({
      address,
      nonce,
      usedAt: new Date()
    });
  }

  /**
   * Get USDC balance for a wallet (placeholder)
   * TODO: Implement with Circle API or on-chain call
   */
  private async getUSDCBalance(walletAddress: string): Promise<string> {
    // USDC contract on Base: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
   const usdcContract = new ethers.Contract(
      '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      ['function balanceOf(address) view returns (uint256)'],
      this.provider
    );

    try {
     const balance = await usdcContract.balanceOf(walletAddress);
     return balance.toString();
    } catch (error) {
    console.error('Balance check error:', error);
     return '0';
    }
  }
}

// Export singleton instance
export const circleGateway = new CircleGateway();
