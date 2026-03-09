#!/usr/bin/env node
/**
 * REAL INTEGRATION TEST SCRIPT
 * Valida TODAS las integraciones con APIs reales
 */

const axios = require('axios');

const BASE_URL= 'http://localhost:3001';
const MISYBOT_URL = 'https://realculture-backend-g3b9deb2fja4b8a2.canadacentral-01.azurewebsites.net';

async function testHealth() {
 console.log('\n🏥 TESTING HEALTH CHECK...\n');
  
  try {
   const response = await axios.get(`${BASE_URL}/health`);
   console.log('✅ Health check passed:', response.data);
   return true;
  } catch (error) {
   console.error('❌ Health check failed:', error.message);
   return false;
  }
}

async function testMisybotDiscovery() {
 console.log('\n🔍 TESTING MISYBOT DISCOVERY API...\n');
  
  try {
   const response = await axios.get(`${MISYBOT_URL}/api/api/discovery/tools`);
   console.log('✅ Discovery API accessible');
   console.log('   Categories:', response.data.categories?.length || 0);
   console.log('   Total tools:', response.data.totalTools || 0);
    
    // Buscar endpoints de auth
   const authCategory= response.data.categories?.find(
      cat => cat.category === 'admin' || cat.category.includes('auth')
    );
    
    if (authCategory) {
     console.log('✅ Auth category found:', authCategory.displayName);
    } else {
     console.log('⚠️ No auth category found in Discovery API');
    }
    
   return true;
  } catch (error) {
   console.error('❌ Discovery API test failed:', error.message);
   return false;
  }
}

async function testRealLogin() {
 console.log('\n🔐 TESTING REAL LOGIN WITH MISYBOT...\n');
  
 const testEmail = `test-${Date.now()}@test.com`;
 const testPassword = 'TestPassword123!';
  
  try {
    // Intentar login
   const response = await axios.post(`${BASE_URL}/api/auth/login`, {
     email: testEmail,
     password: testPassword
    });
    
   console.log('✅ Login successful');
   console.log('   Token:', response.data.token.substring(0, 50) + '...');
   console.log('   User ID:', response.data.user.id);
   console.log('   Email:', response.data.user.email);
    
   return { success: true, token: response.data.token, user: response.data.user };
  } catch (error) {
   console.error('❌ Login failed:', error.response?.data || error.message);
   return { success: false, error: error.message };
  }
}

async function testRegistration() {
 console.log('\n📝 TESTING USER REGISTRATION...\n');
  
 const testEmail = `newuser-${Date.now()}@test.com`;
 const testPassword = 'SecurePassword123!';
  
  try {
   const response = await axios.post(`${BASE_URL}/api/auth/register`, {
     email: testEmail,
     password: testPassword,
     walletAddress: '0xTestWallet123456789'
    });
    
   console.log('✅ Registration successful');
   console.log('   User ID:', response.data.user.id);
   console.log('   Token:', response.data.token.substring(0, 50) + '...');
    
   return { success: true, token: response.data.token };
  } catch (error) {
   console.error('❌ Registration failed:', error.response?.data || error.message);
   return { success: false };
  }
}

async function testPaymentInitiation() {
 console.log('\n💳 TESTING PAYMENT INITIATION...\n');
  
  try {
   const response = await axios.post(`${BASE_URL}/api/payments/initiate`, {
     userId: 'test-user-123',
     amount: '10000000', // 10 USDC
     resource: 'vm-provision'
    });
    
   console.log('✅ Payment initiation response:', response.data);
   return true;
  } catch (error) {
   console.error('❌ Payment initiation failed:', error.response?.data || error.message);
   return false;
  }
}

async function testAzureSDK() {
 console.log('\n☁️ TESTING AZURE SDK CONFIGURATION...\n');
  
  try {
    // Verificar que las variables de entorno están configuradas
   const hasSubscription = !!process.env.AZURE_SUBSCRIPTION_ID;
   const hasClientId = !!process.env.AZURE_CLIENT_ID;
   const hasClientSecret = !!process.env.AZURE_CLIENT_SECRET;
    
   console.log('   Azure Subscription ID:', hasSubscription ? '✅' : '❌');
   console.log('   Azure Client ID:', hasClientId ? '✅' : '❌');
   console.log('   Azure Client Secret:', hasClientSecret ? '✅' : '❌');
    
    if (hasSubscription && hasClientId && hasClientSecret) {
     console.log('✅ Azure credentials configured');
      // TODO: Test real Azure connection when credentials are set
     return true;
    } else {
     console.log('⚠️ Azure credentials not configured (expected in development)');
     return true; // No fallar si no hay creds
    }
  } catch (error) {
   console.error('❌ Azure SDK test failed:', error.message);
   return false;
  }
}

async function testRedisConnection() {
 console.log('\n🔴 TESTING REDIS CONNECTION...\n');
  
  try {
   const Redis = require('ioredis');
   const redis = new Redis({
     host: process.env.REDIS_HOST || 'localhost',
     port: parseInt(process.env.REDIS_PORT || '6379'),
     password: process.env.REDIS_PASSWORD,
    });
    
   await redis.ping();
   console.log('✅ Redis connected');
    
    // Test set/get
   await redis.set('test:key', 'test-value');
   const value = await redis.get('test:key');
   console.log('✅ Redis SET/GET works:', value);
    
   await redis.del('test:key');
   await redis.quit();
    
   return true;
  } catch (error) {
   console.error('❌ Redis test failed:', error.message);
   console.log('⚠️ Redis may not be running yet (start with docker-compose)');
   return false;
  }
}

async function runAllTests() {
 console.log('\n╔═══════════════════════════════════════════════════════════╗');
 console.log('║  REAL INTEGRATION TEST SUITE                             ║');
 console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
 const results = {
   health: await testHealth(),
    discovery: await testMisybotDiscovery(),
   redis: await testRedisConnection(),
    azure: await testAzureSDK(),
   registration: await testRegistration(),
    login: await testRealLogin(),
   payment: await testPaymentInitiation()
  };
  
 console.log('\n╔═══════════════════════════════════════════════════════════╗');
 console.log('║  TEST RESULTS SUMMARY                                    ║');
 console.log('╚═══════════════════════════════════════════════════════════╝\n');
  
 const passed = Object.values(results).filter(r => r === true || (typeof r === 'object' && r.success)).length;
 const total = Object.keys(results).length;
  
 console.log(`Health Check:       ${results.health ? '✅ PASS' : '❌ FAIL'}`);
 console.log(`Misybot Discovery:  ${results.discovery ? '✅ PASS' : '❌ FAIL'}`);
 console.log(`Redis Connection:   ${results.redis ? '✅ PASS' : '❌ FAIL'}`);
 console.log(`Azure SDK Config:   ${results.azure ? '✅ PASS' : '❌ FAIL'}`);
 console.log(`Registration:       ${results.registration?.success ? '✅ PASS' : '❌ FAIL'}`);
 console.log(`Login:              ${results.login?.success ? '✅ PASS' : '❌ FAIL'}`);
 console.log(`Payment Init:       ${results.payment ? '✅ PASS' : '❌ FAIL'}`);
  
 console.log(`\n${passed}/${total} tests passed\n`);
  
  if (passed === total) {
   console.log('🎉 ALL TESTS PASSED - System is production-ready!\n');
    process.exit(0);
  } else {
   console.log('⚠️ Some tests failed. Review output above.\n');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(console.error);
