import { Request, Response } from 'express';
import { db } from '../database/models';

/**
 * DevOps Controller - Health Checks, Metrics, and Logs
 */

export const devopsController= {
  /**
   * Health check endpoint
   * GET /health
   */
  health: (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'twin-ai-infra-backend',
     version: '1.0.0',
      uptime: process.uptime(),
     environment: process.env.NODE_ENV || 'development',
      misybot: process.env.MISYBOT_API_URL,
      circle: process.env.CIRCLE_API_KEY ? 'configured' : 'not-configured',
      azure: process.env.AZURE_SUBSCRIPTION_ID ? 'configured' : 'not-configured'
    });
  },

  /**
   * Prometheus-style metrics endpoint
   * GET /metrics
   */
  metrics: async (req: Request, res: Response) => {
  try {
      // Count documents in each collection
    const [userCount, paymentCount, vmCount, certCount] = await Promise.all([
        db.users.countDocuments(),
        db.payments.countDocuments(),
        db.vms.countDocuments(),
        db.paymentCertificates.countDocuments()
      ]);

      // Active VMs
    const activeVMs = await db.vms.countDocuments({ status: 'active' });

      // Payments by status
    const pendingPayments = await db.payments.countDocuments({ status: 'pending' });
    const completedPayments = await db.payments.countDocuments({ status: 'completed' });

     const metrics = {
        users: userCount,
       payments: {
          total: paymentCount,
          pending: pendingPayments,
         completed: completedPayments
        },
        vms: {
          total: vmCount,
          active: activeVMs
        },
        certificates: certCount,
        timestamp: new Date().toISOString()
      };

      res.json(metrics);
    } catch (error) {
    console.error('Metrics error:', error);
      res.status(500).json({ error: 'Failed to retrieve metrics' });
    }
  },

  /**
   * System logs (last N entries)
   * GET /api/logs?limit=100
   */
  getLogs: async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;

      // In production, you'd use a proper logging system (Winston, Pino, etc.)
      // For now, return a simple response
      res.json({
        success: true,
      message: 'Logs endpoint - integrate with Winston/Pino for production',
       limit,
       logs: []
      });
    } catch (error) {
    console.error('Get logs error:', error);
      res.status(500).json({ error: 'Failed to retrieve logs' });
    }
  },

  /**
   * Database statistics
   * GET /api/stats/db
   */
  dbStats: async (req: Request, res: Response): Promise<any> => {
  try {
    // Get database stats using collection
   const dbStats = await db.users.db.stats();

    const stats = {
      databases: 1,
      collections: 4,
      objects: dbStats.objects || 0,
      dataSize: dbStats.dataSize || 0,
      indexes: dbStats.indexes || 0
    };

      res.json({
        success: true,
       stats: {
         databases: stats.databases,
         collections: stats.collections,
         totalDocuments: stats.objects,
         storageSize: stats.dataSize,
         indexes: stats.indexes
       }
      });
    } catch (error) {
    console.error('DB stats error:', error);
     res.status(500).json({ error: 'Failed to retrieve database stats' });
    }
  }
};
