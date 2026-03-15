/**
 * Azure Manager Stub Implementation
 * Placeholder for testing - full implementation requires Azure credentials
 */

import { db } from '../database/models';

export interface VMRequest {
  userId: string;
  vmSize: string;
  region: string;
  duration: number;
  paymentCertificateId: string;
}

export interface VMResponse {
  vmId: string;
  accessEndpoint: string;
  credentials: {
    username: string;
    sshKey?: string;
  };
  expiresAt: Date;
}

class AzureManagerStub {
  async provisionVM(request: VMRequest): Promise<VMResponse> {
    console.log('🔵 [AZURE STUB] Provisioning VM:', request);
    
    const vmId = `stub-vm-${Date.now()}`;
    
    return {
      vmId,
      accessEndpoint: 'http://localhost:8080',
      credentials: {
        username: 'azureuser'
      },
      expiresAt: new Date(Date.now() + request.duration * 3600000)
    };
  }

  async getVMStatus(vmId: string): Promise<{ status: string; powerState: string }> {
    console.log('🔵 [AZURE STUB] Getting VM status:', vmId);
    return { status: 'running', powerState: 'PowerState/running' };
  }

  async deallocateVM(vmId: string): Promise<void> {
    console.log('🔵 [AZURE STUB] Deallocating VM:', vmId);
    await db.vms.updateOne(
      { vmId },
      { $set: { status: 'deallocated', deallocatedAt: new Date() } }
    );
  }

  async deleteVM(vmId: string): Promise<void> {
    console.log('🔵 [AZURE STUB] Deleting VM:', vmId);
    await db.vms.deleteOne({ vmId });
  }

  async monitorUsage(vmId: string): Promise<{ cpu: number; memory: number; networkIn: number; networkOut: number }> {
    console.log('🔵 [AZURE STUB] Monitoring usage:', vmId);
    return { cpu: 25, memory: 40, networkIn: 100, networkOut: 50 };
  }

  async generateSSHKey(): Promise<string> {
    return 'ssh-rsa STUB_KEY_FOR_TESTING';
  }

  private async getPrivateSSHKey(vmName: string): Promise<string> {
    return '-----BEGIN RSA PRIVATE KEY-----\nSTUB\n-----END RSA PRIVATE KEY-----';
  }
}

export const azureManager = new AzureManagerStub();
