import express, { Request, Response } from 'express';
import cors from 'cors';
import { jwtMiddleware, rateLimiter, optionalJwtMiddleware, misybotAuth, AuthenticatedRequest } from './auth/jwt-middleware';
import { circleController } from './controllers/circle.controller';
import { azureController } from './controllers/azure.controller';
import { devopsController } from './controllers/devops.controller';
import { handleCircleWebhook } from './controllers/webhook.controller';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware stack
app.use(cors());
app.use(express.json());
app.use(rateLimiter); // Global rate limiter (100 req/min)

// ==================== DEVOPS ROUTES ====================

// Health check
app.get('/health', devopsController.health);

// Metrics
app.get('/metrics', devopsController.metrics);

// Logs
app.get('/api/logs', devopsController.getLogs);

// Database stats
app.get('/api/stats/db', devopsController.dbStats);

// ==================== AUTH ROUTES ====================

// Login
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
   const { email, password } = req.body;
    
   console.log(`🔐 Login attempt: ${email}`);
    
   const result = await misybotAuth.login(email, password);
    
    res.json({ 
      success: true,
      token: result.token,
      user: result.user
    });
  } catch (error: any) {
   console.error('Login error:', error);
    res.status(401).json({ 
      success: false,
      error: error.message || 'Authentication failed' 
    });
  }
});

// Register
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
   const { email, password, walletAddress } = req.body;
    
   console.log(`📝 Registration: ${email}`);
    
   const result = await misybotAuth.register(email, password, walletAddress);
    
    res.status(201).json({ 
      success: true,
      token: result.token,
      user: result.user
    });
  } catch (error: any) {
   console.error('Registration error:', error);
    res.status(400).json({ 
      success: false,
      error: error.message || 'Registration failed' 
    });
  }
});

// Refresh token
app.post('/api/auth/refresh', jwtMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Generate new token with same user data
   const newToken = await misybotAuth.refreshToken(req.user!.id);
    
    res.json({ 
      success: true,
      token: newToken 
    });
  } catch (error: any) {
   console.error('Token refresh error:', error);
    res.status(401).json({ 
      success: false,
      error: error.message || 'Token refresh failed' 
    });
  }
});

// ==================== CIRCLE PAYMENT ROUTES ====================

// Initiate payment (requires auth)
app.post('/api/payments/initiate', jwtMiddleware, circleController.initiatePayment);

// Verify payment signature (requires auth)
app.post('/api/payments/verify', jwtMiddleware, circleController.verifyPayment);

// Get payment certificate (requires auth)
app.get('/api/payments/certificate/:id', jwtMiddleware, circleController.getCertificate);

// Get payment history (requires auth)
app.get('/api/payments/history/:userId', jwtMiddleware, circleController.getPaymentHistory);

// Get subscriptions (requires auth)
app.get('/api/payments/subscriptions/:userId', jwtMiddleware, circleController.getSubscriptions);

// Cancel subscription (requires auth)
app.post('/api/payments/subscriptions/:id/cancel', jwtMiddleware, circleController.cancelSubscription);

// Webhook handler for Circle (no auth - signed by Circle)
app.post('/api/payments/webhook', circleController.verifyPayment);

// Circle Webhook Handler (CRITICAL - Payment settlement notifications)
app.post('/api/webhooks/circle', handleCircleWebhook);

// Webhook health check (for debugging)
app.get('/api/webhooks/circle/health', (req: Request, res: Response) => {
  res.json({ 
 status: 'ok', 
 endpoint: '/api/webhooks/circle',
 verified: !!process.env.CIRCLE_WEBHOOK_SECRET,
 timestamp: new Date().toISOString()
  });
});

// ==================== AZURE INFRASTRUCTURE ROUTES ====================

// Provision VM (requires auth + payment)
app.post('/api/infra/provision', jwtMiddleware, azureController.provisionVM);

// Get VM status (requires auth)
app.get('/api/infra/status/:vmId', jwtMiddleware, azureController.getVMStatus);

// Deallocate VM (requires auth)
app.delete('/api/infra/deallocate/:vmId', jwtMiddleware, azureController.deallocateVM);

// Get user's VMs (requires auth)
app.get('/api/infra/vms/:userId', jwtMiddleware, azureController.getUserVMs);

// Get usage metrics (requires auth)
app.get('/api/infra/usage/:userId', jwtMiddleware, azureController.getUsageMetrics);

// ==================== ERROR HANDLING ====================

app.use((err: any, req: Request, res: Response, next: any) => {
 console.error('Global error handler:', err);
 res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
 console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🚀 Twin AI Infrastructure Backend                      ║
║   Status: Running                                        ║
║   Port: ${PORT}                                           ║
║   Environment: ${process.env.NODE_ENV || 'development'}                              ║
║                                                          ║
║   Services:                                              ║
║   • Misybot Auth: ${process.env.MISYBOT_API_URL ? '✅' : '❌'}            ║
║   • Circle API: ${process.env.CIRCLE_API_KEY ? '✅' : '❌'}                 ║
║   • Azure SDK: ${process.env.AZURE_SUBSCRIPTION_ID ? '✅' : '❌'}               ║
║   • MongoDB: ${process.env.MONGODB_URI ? '✅' : '❌'}                     ║
║   • Redis: ${process.env.REDIS_HOST ? '✅' : '❌'}                        ║
║                                                          ║
║   Endpoints:                                             ║
║   • Health: http://localhost:${PORT}/health              ║
║   • Metrics: http://localhost:${PORT}/metrics            ║
║   • Auth: /api/auth/*                                    ║
║   • Payments: /api/payments/*                            ║
║   • Infra: /api/infra/*                                  ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
  `);
});
