// backend/test-webhook.js
// Test script for Circle Webhook Handler
// Usage: node test-webhook.js

const crypto = require('crypto');
const axios = require('axios');

const WEBHOOK_SECRET = process.env.CIRCLE_WEBHOOK_SECRET || 'test_secret';
const WEBHOOK_URL = 'http://localhost:3001/api/webhooks/circle';

// Create test payload
const testPayload = {
  event: {
    id: `test_${Date.now()}`,
    type: 'payment.settled',
    created_at: new Date().toISOString(),
    data: {
     transactionId: `tx_test_${Date.now()}`,
      amount: '0.30',
      asset: 'USDC',
      walletAddress: '0xTestWallet...',
      onChainTxHash: '0xTestTxHash...'
    }
  }
};

// Sign payload (same method as Circle)
function signPayload(payload, secret) {
 return crypto.createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
}

async function testWebhook() {
 const signature = signPayload(testPayload, WEBHOOK_SECRET);
  
 console.log('🔐 Testing Circle Webhook Handler...\n');
console.log('Payload:', JSON.stringify(testPayload, null, 2));
console.log('Signature:', signature);
console.log('\nSending to:', WEBHOOK_URL);
  
  try {
  const response = await axios.post(WEBHOOK_URL, testPayload, {
     headers: {
        'Content-Type': 'application/json',
        'x-circle-signature': signature
      }
    });
    
  console.log('\n✅ Webhook test successful!');
  console.log('Response:', response.data);
  } catch (error) {
  console.error('\n❌ Webhook test failed!');
  console.error('Status:', error.response?.status);
  console.error('Response:', error.response?.data);
  console.error('Message:', error.message);
  }
}

// Run test
testWebhook();
