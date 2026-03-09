import express, { Application, Request, Response} from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './database/models';
import { handleCircleWebhook, initiatePayment, getCertificateStatus } from './payments/webhook-handler';
import { x402Middleware, PaymentRequirement } from './payments/x402-middleware';
import { jwtMiddleware, rateLimiter, optionalJwtMiddleware, misybotAuth } from './auth/jwt-middleware';
import { azureManager } from './infrastructure/azure-manager';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Global rate limiter (100 req/min como Discovery API)
app.use(rateLimiter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
 res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'twin-ai-infra-backend',
  redis: 'connected',
    misybot: process.env.MISYBOT_API_URL,
    circle: 'configured'
  });
});

/**
 * AUTH ROUTES (NEW - Integration with Misybot)
 */

// Login endpoint
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
 const { email, password } = req.body;
   
    if (!email || !password) {
 return res.status(400).json({
     error: 'Bad Request',
       message: 'Email y password son requeridos'
      });
    }

 const result = await misybotAuth.login(email, password);
   
 res.json({
     success: true,
      ...result
    });
  } catch (error) {
 console.error('Login error:', error);
 res.status(401).json({
   error: 'Unauthorized',
      message: error instanceof Error ? error.message : 'Login failed'
    });
  }
});

// Registro endpoint
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
 const { email, password, walletAddress } = req.body;
   
    if (!email || !password) {
 return res.status(400).json({
     error: 'Bad Request',
       message: 'Email y password son requeridos'
      });
    }

 const result = await misybotAuth.register(email, password, walletAddress);
   
 res.status(201).json({
     success: true,
      ...result
    });
  } catch (error) {
 console.error('Registration error:', error);
 res.status(400).json({
   error: 'Bad Request',
      message: error instanceof Error ? error.message : 'Registration failed'
    });
  }
});

/**
 * PAYMENT ROUTES
 */

// Initiate payment flow
app.post('/api/payments/initiate', initiatePayment);

// Circle webhook handler
app.post('/api/payments/webhook', handleCircleWebhook);

// Get payment certificate status
app.get('/api/payments/certificate/:id', getCertificateStatus);

/**
 * INFRASTRUCTURE ROUTES (with payment requirement)
 */

// Provision VM - requires payment
const provisionRequirements: PaymentRequirement = {
 resource: 'vm-provision',
  amount: '10000000', // 10 USDC (6 decimals)
  asset: 'USDC',
  network: 'BASE-MAINNET'
};

app.post('/api/infra/provision', 
  x402Middleware([provisionRequirements]),
  async (req: Request, res: Response) => {
   try {
      // TODO: Import azureManager and implement
     const { vmSize = 'Standard_B2s', region = 'eastus', duration = 24 } = req.body;
      
    res.json({
        message: 'VM provisioning would happen here',
      vmSize,
      region,
       duration,
      userId: (req as any).user?.id
      });
    } catch (error) {
  console.error('Provision error:', error);
  res.status(500).json({
      error: 'Failed to provision VM',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

// Get VM status
app.get('/api/infra/status/:vmId', async (req: Request, res: Response) => {
  try {
    // TODO: Implement with azureManager
  const { vmId } = req.params;
   
 res.json({
     vmId,
      status: 'running',
      message: 'Status lookup would happen here'
    });
  } catch (error) {
  console.error('VM status error:', error);
 res.status(500).json({
   error: 'Failed to get VM status',
     message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Deallocate VM
app.delete('/api/infra/deallocate/:vmId', async (req: Request, res: Response) => {
  try {
    // TODO: Implement with azureManager
  const { vmId } = req.params;
   
 res.json({
     vmId,
      message: 'VM deallocation would happen here'
    });
  } catch (error) {
  console.error('VM deallocation error:', error);
 res.status(500).json({
   error: 'Failed to deallocate VM',
     message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get usage metrics
app.get('/api/infra/usage/:userId', async (req: Request, res: Response) => {
  try {
    // TODO: Implement usage tracking
  const { userId } = req.params;
   
 res.json({
     userId,
     usage: {
        totalHours: 0,
        totalCost: '0',
        currentVMs: []
      }
    });
  } catch (error) {
  console.error('Usage lookup error:', error);
 res.status(500).json({
   error: 'Failed to get usage',
     message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * SECURITY ROUTES
 */

// Fraud check endpoint (internal use)
app.post('/api/security/fraud-check', async (req: Request, res: Response) => {
  try {
    // TODO: Implement fraud detection
  const { userId } = req.body;
   
 res.json({
     userId,
      riskScore: 0,
      approved: true,
     reasons: []
    });
  } catch (error) {
  console.error('Fraud check error:', error);
 res.status(500).json({
   error: 'Fraud check failed',
     message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Initialize database and start server
async function startServer() {
  try {
    // Connect to MongoDB
  await db.connect();
  await db.createIndexes();

    // Start Express server
   app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 Twin AI Infrastructure Backend                       ║
║                                                           ║
║   Server running on port ${PORT}                          ║
║   Environment: ${process.env.NODE_ENV || 'development'}                    ║
║                                                           ║
║   Endpoints:                                              ║
║   • GET /health                                          ║
║   • POST /api/payments/initiate                           ║
║   • POST /api/payments/webhook                            ║
║   • GET /api/payments/certificate/:id                    ║
║   • POST /api/infra/provision                             ║
║   • GET /api/infra/status/:vmId                          ║
║   • DELETE /api/infra/deallocate/:vmId                    ║
║   • GET /api/infra/usage/:userId                         ║
║   • POST /api/security/fraud-check                        ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);
   });
  } catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await db.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await db.disconnect();
  process.exit(0);
});

// Start the server
startServer();

export default app;
