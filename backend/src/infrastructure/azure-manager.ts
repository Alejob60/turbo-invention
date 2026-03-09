import { ComputeManagementClient } from '@azure/arm-compute';
import { NetworkManagementClient } from '@azure/arm-network';
import { DefaultAzureCredential } from '@azure/identity';
import { db, VM } from '../database/models';

export interface VMRequest {
  userId: string;
  vmSize: string;
 region: string;
  duration: number; // hours
  paymentCertificateId: string;
}

export interface VMResponse {
  vmId: string;
  accessEndpoint: string;
  credentials: {
   username: string;
    sshKey: string;
  };
  expiresAt: Date;
}

export class AzureManager {
  private computeClient: ComputeManagementClient;
  private networkClient: NetworkManagementClient;
  private subscriptionId: string;
  private resourceGroup: string;

  constructor() {
  const credential = new DefaultAzureCredential();
   this.subscriptionId = process.env.AZURE_SUBSCRIPTION_ID!;
   this.resourceGroup = process.env.AZURE_RESOURCE_GROUP || 'twin-ai-infra-rg';
    
   this.computeClient = new ComputeManagementClient(credential, this.subscriptionId);
   this.networkClient = new NetworkManagementClient(credential, this.subscriptionId);
  }

  /**
   * Provision a Spot VM (60-90% cheaper than regular VMs)
   */
  async provisionVM(request: VMRequest): Promise<VMResponse> {
   try {
  const vmName = `vm-${request.userId}-${Date.now()}`;

      // Configure Spot VM (critical for cost reduction)
  const vmConfig = {
       location: request.region,
       hardwareProfile: { vmSize: request.vmSize },
       storageProfile: {
        imageReference: {
         publisher: 'Canonical',
           offer: 'UbuntuServer',
           sku: '22_04-lts',
           version: 'latest'
        },
        osDisk: {
          createOption: 'FromImage',
          managedDisk: { storageAccountType: 'Standard_LRS' },
          diskSizeGB: 128
        }
      },
       osProfile: {
       computerName: vmName,
        adminUsername: 'azureuser',
        linuxConfiguration: {
          disablePasswordAuthentication: true,
          ssh: {
           publicKeys: [{
             path: '/home/azureuser/.ssh/authorized_keys',
             keyData: await this.generateSSHKey()
            }]
          }
        }
      },
       networkProfile: {
        networkInterfaces: [{
         id: await this.createNIC(vmName, request.region),
          primary: true
        }]
      },
       // SPOT CONFIG - Key for low pricing
       priority: 'Spot',
       evictionPolicy: 'Deallocate', // Allows resume
       billingProfile: { maxPrice: -1 } // Accept any spot price
     };

      // Create VM
   console.log(`🚀 Creating Spot VM: ${vmName}`);
  const poller= await this.computeClient.virtualMachines.beginCreateOrUpdate(
       this.resourceGroup,
       vmName,
       vmConfig as any
      );

  const vm = await poller.pollUntilDone();

      // Save VM metadata to database
  const vmRecord: VM = {
       vmId: vm.id!,
       userId: request.userId,
      paymentCertificateId: request.paymentCertificateId,
       status: 'running',
      region: request.region,
       vmSize: request.vmSize,
       createdAt: new Date(),
       expiresAt: new Date(Date.now() + request.duration * 3600000)
     };

  await db.vms.insertOne(vmRecord);

      // Mark payment certificate as used
   // TODO: Import and use circleGateway
   // await circleGateway.useCertificate(request.paymentCertificateId);

  return {
       vmId: vm.id!,
       accessEndpoint: await this.getPublicIP(vmName),
       credentials: {
        username: 'azureuser',
        sshKey: await this.getPrivateSSHKey(vmName)
      },
       expiresAt: new Date(Date.now() + request.duration * 3600000)
     };
    } catch (error) {
  console.error('VM provisioning error:', error);
      throw new Error('Failed to provision VM');
    }
  }

  /**
   * Get VM status
   */
  async getVMStatus(vmId: string): Promise<{ status: string; powerState: string }> {
   try {
  const vmName = vmId.split('/').pop()!;
  const instanceView = await this.computeClient.virtualMachines.getInstanceView(
       this.resourceGroup,
       vmName
      );

  const powerState = instanceView.statuses?.find(s => s.code.startsWith('PowerState/'))?.code || 'unknown';
  const status = powerState.includes('running') ? 'running' : 'stopped';

  return { status, powerState };
    } catch (error) {
  console.error('VM status error:', error);
  return { status: 'error', powerState: 'unknown' };
    }
  }

  /**
   * Deallocate VM (stop billing but keep data)
   */
  async deallocateVM(vmId: string): Promise<void> {
   try {
  const vmName = vmId.split('/').pop()!;
  console.log(`⏹️ Deallocating VM: ${vmName}`);
    
  await this.computeClient.virtualMachines.deallocate(
       this.resourceGroup,
       vmName
      );

  await db.vms.updateOne(
       { vmId },
       { $set: { status: 'deallocated', deallocatedAt: new Date() } }
      );
    } catch (error) {
  console.error('VM deallocation error:', error);
      throw error;
    }
  }

  /**
   * Delete VM permanently
   */
  async deleteVM(vmId: string): Promise<void> {
   try {
  const vmName = vmId.split('/').pop()!;
  console.log(`🗑️ Deleting VM: ${vmName}`);
    
  await this.computeClient.virtualMachines.beginDelete(
       this.resourceGroup,
       vmName
      );

  await db.vms.deleteOne({ vmId });
    } catch (error) {
  console.error('VM deletion error:', error);
      throw error;
    }
  }

  /**
   * Monitor VM usage in real-time
   */
  async monitorUsage(vmId: string): Promise<{
    cpu: number;
    memory: number;
    network: number;
    storage: number;
  }> {
   try {
  const vmName = vmId.split('/').pop()!;
  const metrics = await this.computeClient.virtualMachines.getInstanceView(
       this.resourceGroup,
       vmName
      );

      // Get metrics from instance view
  const cpu = metrics.disks?.[0]?.metrics?.[0]?.average || 0;
  const storage = metrics.disks?.[0]?.diskSizeGB || 0;

      // Memory and network require Azure Monitor API (placeholder)
  const memory = 0;
  const network = 0;

  return { cpu, memory, network, storage };
    } catch (error) {
  console.error('Usage monitoring error:', error);
  return { cpu: 0, memory: 0, network: 0, storage: 0 };
    }
  }

  /**
   * Auto-scale based on usage
   */
  async autoScale(userId: string, currentUsage: number): Promise<void> {
   const threshold = 80; // 80% CPU
    
    if (currentUsage > threshold) {
  console.log(`📈 High usage detected (${currentUsage}%), scaling up...`);
  await this.scaleUp(userId);
    } else if (currentUsage < 30) {
  console.log(`📉 Low usage detected (${currentUsage}%), scaling down...`);
  await this.scaleDown(userId);
    }
  }

  /**
   * Cleanup expired VMs
   */
  async cleanupExpiredVMs(): Promise<void> {
   try {
  const expired = await db.vms.find({
       expiresAt: { $lt: new Date() },
       status: 'running'
      }).toArray();

   for (const vm of expired) {
     console.log(`⏰ VM expired: ${vm.vmId}`);
      
      // Notify user before deallocation
   // await notifyUser(vm.userId, 'VM expiring soon');
      
      // Deallocate (allows resume if user renews)
  await this.deallocateVM(vm.vmId);
    }

  console.log(`✅ Cleaned up ${expired.length} expired VMs`);
    } catch (error) {
  console.error('Cleanup error:', error);
    }
  }

  private async createNIC(vmName: string, region: string): Promise<string> {
  const nicName = `${vmName}-nic`;
   
  const nic = await this.networkClient.networkInterfaces.beginCreateOrUpdate(
       this.resourceGroup,
       nicName,
      {
        location: region,
        ipConfigurations: [{
          name: 'ipconfig1',
          subnet: { 
          id: `/subscriptions/${this.subscriptionId}/resourceGroups/${this.resourceGroup}/providers/Microsoft.Network/virtualNetworks/${this.resourceGroup}-vnet/subnets/default` 
         },
         publicIPAddress: {
           id: await this.createPublicIP(vmName, region)
          }
        }]
      }
      );

  const result = await nic.pollUntilDone();
  return result.id!;
  }

  private async createPublicIP(vmName: string, region: string): Promise<string> {
  const ipName = `${vmName}-pip`;
   
  const ip = await this.networkClient.publicIPAddresses.beginCreateOrUpdate(
       this.resourceGroup,
       ipName,
      {
        location: region,
       publicIPAllocationMethod: 'Dynamic',
        sku: { name: 'Basic' }
      }
      );

  const result = await ip.pollUntilDone();
  return result.id!;
  }

  private async generateSSHKey(): Promise<string> {
    // In production, use proper SSH key generation library
  const crypto = require('crypto');
  const { publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
     publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      }
    });
    
  return publicKey;
  }

  private async getPrivateSSHKey(vmName: string): Promise<string> {
    // TODO: Retrieve encrypted private key from secure storage
  return 'encrypted-ssh-private-key-placeholder';
  }

  private async scaleUp(userId: string): Promise<void> {
  console.log('Scale up not implemented yet');
    // TODO: Implement vertical/horizontal scaling
  }

  private async scaleDown(userId: string): Promise<void> {
  console.log('Scale down not implemented yet');
    // TODO: Implement resource reduction
  }
}

// Export singleton instance
export const azureManager = new AzureManager();
