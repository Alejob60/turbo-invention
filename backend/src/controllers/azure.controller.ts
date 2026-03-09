import { Request, Response } from 'express';
import { azureManager } from '../infrastructure/azure-manager';

/**
 * Azure Infrastructure Controller
 * Handles VM provisioning, monitoring, and deallocation
 */

export const azureController= {
  /**
   * Provision a new VM (Spot instance)
   * POST /api/infra/provision
   */
  provisionVM: async (req: Request, res: Response) => {
   try {
    const userId = req.user?.id || 'anonymous';
    const { resource, vmSize = 'Standard_B2s', region = 'canadacentral', duration = 24 } = req.body;

     console.log(`🔥 Provisioning VM for ${userId}: ${vmSize} in ${region}`);

    const result = await azureManager.provisionVM({
        userId,
       vmSize,
       region,
       duration,
       resource
      });

      // Store VM in database
    const vm = await db.vms.insertOne({
        userId,
       vmId: result.vmId,
       vmSize,
       region,
       status: 'active',
       accessEndpoint: result.accessEndpoint,
       credentials: { username: result.credentials.username },
       expiresAt: result.expiresAt,
       createdAt: new Date()
      });

      res.json({
        success: true,
       vmId: result.vmId,
       accessEndpoint: result.accessEndpoint,
       expiresAt: result.expiresAt,
      message: 'VM provisioned successfully'
      });
    } catch (error) {
    console.error('Provision VM error:', error);
      res.status(500).json({ error: 'Failed to provision VM' });
    }
  },

  /**
   * Get VM status
   * GET /api/infra/status/:vmId
   */
  getVMStatus: async (req: Request, res: Response) => {
   try {
    const { vmId } = req.params;

    const vm = await db.vms.findOne({ vmId });

      if (!vm) {
        return res.status(404).json({ error: 'VM not found' });
      }

      // Check if expired
      if (new Date() > vm.expiresAt && vm.status === 'active') {
        await azureManager.deallocateVM(vmId);
        await db.vms.updateOne(
          { vmId },
          { $set: { status: 'expired' } }
        );
        vm.status = 'expired';
      }

      res.json({
        success: true,
       vm
      });
    } catch (error) {
    console.error('Get VM status error:', error);
      res.status(500).json({ error: 'Failed to retrieve VM status' });
    }
  },

  /**
   * Deallocate/destroy VM
   * DELETE /api/infra/deallocate/:vmId
   */
  deallocateVM: async (req: Request, res: Response) => {
   try {
    const { vmId } = req.params;

      await azureManager.deallocateVM(vmId);

      await db.vms.updateOne(
        { vmId },
        { $set: { status: 'deallocated', deallocatedAt: new Date() } }
      );

      res.json({
        success: true,
      message: 'VM deallocated successfully'
      });
    } catch (error) {
    console.error('Deallocate VM error:', error);
      res.status(500).json({ error: 'Failed to deallocate VM' });
    }
  },

  /**
   * Get user's active VMs
   * GET /api/infra/vms/:userId
   */
  getUserVMs: async (req: Request, res: Response) => {
   try {
    const { userId } = req.params;

    const vms = await db.vms.find({ 
        userId,
        status: { $in: ['active', 'running'] }
      }).toArray();

      res.json({
        success: true,
      count: vms.length,
       vms
      });
    } catch (error) {
    console.error('Get user VMs error:', error);
      res.status(500).json({ error: 'Failed to retrieve VMs' });
    }
  },

  /**
   * Get usage metrics for user
   * GET /api/infra/usage/:userId
   */
  getUsageMetrics: async (req: Request, res: Response) => {
   try {
    const { userId } = req.params;

      // Get all user's VMs
    const allVMs = await db.vms.find({ userId }).toArray();

      // Calculate metrics
    const totalVMs = allVMs.length;
    const activeVMs = allVMs.filter(vm => vm.status === 'active').length;
    const expiredVMs = allVMs.filter(vm => vm.status === 'expired').length;

      // Calculate total hours used
    const totalHours = allVMs.reduce((acc, vm) => {
       const createdAt = new Date(vm.createdAt).getTime();
       const endedAt = vm.deallocatedAt ? new Date(vm.deallocatedAt).getTime() : Date.now();
        return acc + (endedAt - createdAt) / (1000 * 60 * 60);
      }, 0);

      // Estimate cost (simplified- would need Azure Pricing API for accuracy)
    const estimatedCost = totalHours * 0.05; // ~$0.05/hour for B2s Spot

      res.json({
        success: true,
      metrics: {
         totalVMs,
         activeVMs,
         expiredVMs,
         totalHours: Math.round(totalHours * 100) / 100,
         estimatedCost: Math.round(estimatedCost * 100) / 100
        }
      });
    } catch (error) {
    console.error('Get usage metrics error:', error);
      res.status(500).json({ error: 'Failed to retrieve usage metrics' });
    }
  }
};
