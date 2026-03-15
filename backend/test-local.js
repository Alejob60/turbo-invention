/**
 * Local Integration Test Script
 * Tests all microservices without external dependencies
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

console.log('🧪 TWIN AI INFRA - LOCAL INTEGRATION TEST\n');
console.log('=' .repeat(60));

async function testHealthCheck() {
  console.log('\n1️⃣  Testing Health Check...\n');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Backend is running!');
    console.log('   Status:', response.data.status);
    console.log('   Service:', response.data.service);
    console.log('   Redis:', response.data.redis || 'not configured');
    console.log('   Misybot:', response.data.misybot || 'not configured');
    return true;
  } catch (error) {
    console.error('❌ Backend not accessible');
    console.error('   Error:', error.message);
    return false;
  }
}

async function testRegistration() {
  console.log('\n2️⃣  Testing User Registration...\n');
  try {
    const testEmail = `test-${Date.now()}@test.com`;
    const testPassword = 'TestPassword123!';
    
    const response = await axios.post(`${BASE_URL}/api/auth/register`, {
      email: testEmail,
      password: testPassword
    });
    
    console.log('✅ Registration successful!');
    console.log('   User ID:', response.data.user.id);
    console.log('   Email:', response.data.user.email);
    console.log('   Token:', response.data.token.substring(0, 50) + '...');
    
    return { success: true, email: testEmail, password: testPassword };
  } catch (error) {
    console.error('❌ Registration failed');
    console.error('   Error:', error.response?.data || error.message);
    return { success: false };
  }
}

async function testLogin(email, password) {
  console.log('\n3️⃣  Testing User Login...\n');
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email,
      password
    });
    
    console.log('✅ Login successful!');
    console.log('   User ID:', response.data.user.id);
    console.log('   Email:', response.data.user.email);
    console.log('   Token:', response.data.token.substring(0, 50) + '...');
    
    return { success: true, token: response.data.token, user: response.data.user };
  } catch (error) {
    console.error('❌ Login failed');
    console.error('   Error:', error.response?.data || error.message);
    return { success: false };
  }
}

async function testPaymentInitiation(token) {
  console.log('\n4️⃣  Testing Payment Initiation...\n');
  try {
    const response = await axios.post(
      `${BASE_URL}/api/payments/initiate`,
      {
        userId: 'test-user-123',
        amount: '9.99',
        resource: 'vm-basic'
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ Payment initiated!');
    console.log('   Success:', response.data.success);
    console.log('   Message:', response.data.message);
    console.log('   Amount:', response.data.paymentDetails?.amount);
    console.log('   Resource:', response.data.paymentDetails?.resource);
    
    return { success: true, paymentDetails: response.data.paymentDetails };
  } catch (error) {
    console.error('❌ Payment initiation failed');
    console.error('   Error:', error.response?.data || error.message);
    return { success: false };
  }
}

async function testAzureProvisioning(token) {
  console.log('\n5️⃣  Testing Azure VM Provisioning (STUB)...\n');
  try {
    const response = await axios.post(
      `${BASE_URL}/api/infra/provision`,
      {
        vmSize: 'Standard_B2s',
        region: 'canadacentral',
        duration: 24
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ VM provisioned (STUB)!');
    console.log('   VM ID:', response.data.vmId);
    console.log('   Access Endpoint:', response.data.accessEndpoint);
    console.log('   Expires At:', new Date(response.data.expiresAt).toLocaleString());
    
    return { success: true, vmId: response.data.vmId };
  } catch (error) {
    console.error('❌ VM provisioning failed');
    console.error('   Error:', error.response?.data || error.message);
    return { success: false };
  }
}

async function testDatabaseStats(token) {
  console.log('\n6️⃣  Testing Database Stats...\n');
  try {
    const response = await axios.get(`${BASE_URL}/api/stats/db`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Database stats retrieved!');
    console.log('   Databases:', response.data.stats.databases);
    console.log('   Collections:', response.data.stats.collections);
    console.log('   Total Documents:', response.data.stats.totalDocuments);
    console.log('   Storage Size:', response.data.stats.storageSize);
    console.log('   Indexes:', response.data.stats.indexes);
    
    return true;
  } catch (error) {
    console.error('❌ Database stats failed');
    console.error('   Error:', error.response?.data || error.message);
    return false;
  }
}

async function runAllTests() {
  console.log('\n📋 RUNNING ALL TESTS...\n');
  console.log('=' .repeat(60));
  
  // Test 1: Health Check
  const healthOk = await testHealthCheck();
  if (!healthOk) {
    console.log('\n❌ BACKEND NOT RUNNING - Please start the server first!');
    console.log('   Run: npm run dev\n');
    return;
  }
  
  // Test 2: Registration
  const regResult = await testRegistration();
  if (!regResult.success) {
    console.log('\n⚠️  Registration skipped (may already exist)\n');
  }
  
  // Test 3: Login
  const loginResult = await testLogin(regResult.email, regResult.password);
  if (!loginResult.success) {
    console.log('\n❌ LOGIN FAILED - Cannot continue tests\n');
    return;
  }
  
  // Test 4: Payment Initiation
  await testPaymentInitiation(loginResult.token);
  
  // Test 5: Azure VM Provisioning
  await testAzureProvisioning(loginResult.token);
  
  // Test 6: Database Stats
  await testDatabaseStats(loginResult.token);
  
  console.log('\n' + '=' .repeat(60));
  console.log('✅ ALL TESTS COMPLETED!\n');
  console.log('Next steps:');
  console.log('1. Configure Circle API keys in .env.production');
  console.log('2. Configure Azure credentials in .env.production');
  console.log('3. Run production deployment with Docker Compose\n');
}

// Run all tests
runAllTests().catch(console.error);
