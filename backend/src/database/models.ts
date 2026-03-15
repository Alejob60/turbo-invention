import { MongoClient, ObjectId, Db } from 'mongodb';

// Database Interfaces
export interface User {
  _id?: ObjectId;
  id: string;
  email: string;
  walletAddress?: string;
  kycStatus: 'pending' | 'verified' | 'rejected';
  createdAt: Date;
  activePaymentCertificate?: string;
}

export interface Payment {
 _id?: ObjectId;
 transactionId: string;
 userId: string;
 amount: string;
 resource: string;
 subscriptionType?: 'one-time' | 'subscription';
 vmId?: string;
 status: 'pending' | 'certified' | 'completed' | 'settled' | 'failed' | 'cancelled' | 'confirmed';
 certificateId?: string;
 signature?: string;
 nonce?: number;
 createdAt: Date;
 settledAt?: Date;
 cancelledAt?: Date;
 confirmedAt?: Date;
}

export interface PaymentCertificate {
 _id?: ObjectId;
 certificateId: string;
 userId: string;
 amount: string;
 resource: string;
 status: 'active' | 'used' | 'expired' | 'cancelled' | 'pending';
 createdAt: Date;
 expiresAt: Date;
}

export interface VM {
 _id?: ObjectId;
 vmId: string;
 userId: string;
 paymentCertificateId: string;
 status: 'active' | 'running' | 'deallocated' | 'stopped' | 'expired';
 region: string;
 vmSize: string;
 accessEndpoint?: string;
 createdAt: Date;
 expiresAt: Date;
 deallocatedAt?: Date;
}

export interface UsageMetric {
  _id?: ObjectId;
  userId: string;
  vmId: string;
  cpu: number;
  memory: number;
  network: number;
  storage: number;
  timestamp: Date;
}

export interface NonceRecord {
  _id?: ObjectId;
  address: string;
  nonce: number;
  usedAt: Date;
}

export interface RateLimitRecord {
  _id?: ObjectId;
  userId: string;
  endpoint: string;
  createdAt: Date;
}

export interface AuditLog {
  _id?: ObjectId;
  type: 'fraud_check' | 'rate_limit_exceeded' | 'signature_tamper_attempt' | 'usage_anomaly';
  userId?: string;
  riskScore?: number;
  approved?: boolean;
 reasons?: string[];
  endpoint?: string;
  payload?: any;
  signature?: string;
  anomalies?: string[];
  action?: string;
  severity?: string;
  timestamp: Date;
  immutable: boolean;
}

export interface Wallet {
  _id?: ObjectId;
  walletId: string;
  address: string;
  userId: string;
  type: 'human' | 'agent';
  blockchain: string;
  createdAt: Date;
}

// Database Connection
export class Database {
  private static instance: Database;
  private client: MongoClient;
  private db: Db;

  private constructor() {
   const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    this.client = new MongoClient(mongoUri);
    this.db = this.client.db('twin-ai-infra');
  }

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
   return Database.instance;
  }

  async connect(): Promise<void> {
    try {
     await this.client.connect();
     console.log('✅ MongoDB connected successfully');
    } catch (error) {
     console.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
   await this.client.close();
   console.log('MongoDB disconnected');
  }

  // Collections
  get users() { return this.db.collection<User>('users'); }
  get payments() { return this.db.collection<Payment>('payments'); }
  get paymentCertificates() { return this.db.collection<PaymentCertificate>('paymentCertificates'); }
  get vms() { return this.db.collection<VM>('vms'); }
  get usageMetrics() { return this.db.collection<UsageMetric>('usageMetrics'); }
  get nonces() { return this.db.collection<NonceRecord>('nonces'); }
  get rateLimits() { return this.db.collection<RateLimitRecord>('rateLimits'); }
  get auditLogs() { return this.db.collection<AuditLog>('auditLogs'); }
  get wallets() { return this.db.collection<Wallet>('wallets'); }

  // Index creation
  async createIndexes(): Promise<void> {
    // Users indexes
   await this.users.createIndex({ email: 1 }, { unique: true });
   await this.users.createIndex({ id: 1 }, { unique: true });

    // Payments indexes
   await this.payments.createIndex({ transactionId: 1 }, { unique: true });
   await this.payments.createIndex({ userId: 1 });
   await this.payments.createIndex({ certificateId: 1 });
   await this.payments.createIndex({ status: 1 });

    // Payment certificates indexes
   await this.paymentCertificates.createIndex({ certificateId: 1 }, { unique: true });
   await this.paymentCertificates.createIndex({ userId: 1 });
   await this.paymentCertificates.createIndex({ expiresAt: 1 });

    // VMs indexes
   await this.vms.createIndex({ vmId: 1 }, { unique: true });
   await this.vms.createIndex({ userId: 1 });
   await this.vms.createIndex({ status: 1 });
   await this.vms.createIndex({ expiresAt: 1 });

    // Nonces indexes
   await this.nonces.createIndex({ address: 1, nonce: 1 }, { unique: true });

    // Rate limits indexes
   await this.rateLimits.createIndex({ userId: 1, endpoint: 1, createdAt: 1 });

    // Audit logs indexes
   await this.auditLogs.createIndex({ type: 1, timestamp: 1 });
   await this.auditLogs.createIndex({ userId: 1, timestamp: 1 });

   console.log('✅ Database indexes created');
  }
}

// Export singleton instance
export const db = Database.getInstance();
