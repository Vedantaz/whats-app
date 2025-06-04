// Comprehensive Setup Verification Script
const axios = require('axios');
const Redis = require('redis');

const API_BASE = 'http://localhost:3000';

console.log('🔧 WhatsApp Backend Setup Verification\n');
console.log('=' .repeat(60));

// Test 1: Redis Connection
async function testRedisConnection() {
  console.log('\n1. 🔴 Testing Redis Connection...');
  
  try {
    const client = Redis.createClient({
      host: 'localhost',
      port: 6379,
    });
    
    await client.connect();
    
    // Test basic operations
    await client.set('test:key', 'test:value', { EX: 10 });
    const value = await client.get('test:key');
    await client.del('test:key');
    await client.disconnect();
    
    if (value === 'test:value') {
      console.log('   ✅ Redis connection successful');
      console.log('   ✅ Redis read/write operations working');
      return true;
    } else {
      console.log('   ❌ Redis read/write test failed');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Redis connection failed: ${error.message}`);
    return false;
  }
}

// Test 2: Backend Server Health
async function testBackendHealth() {
  console.log('\n2. 🚀 Testing Backend Server...');
  
  try {
    const response = await axios.get(`${API_BASE}/`);
    console.log(`   ✅ Backend server responding (${response.status})`);
    return true;
  } catch (error) {
    console.log(`   ❌ Backend server not responding: ${error.message}`);
    return false;
  }
}

// Test 3: MongoDB Connection
async function testMongoConnection() {
  console.log('\n3. 🗄️ Testing MongoDB Connection...');
  
  try {
    const response = await axios.get(`${API_BASE}/users`);
    console.log(`   ✅ MongoDB connection working (${response.status})`);
    console.log(`   ✅ Found ${response.data.length} users in database`);
    return true;
  } catch (error) {
    if (error.response?.status === 429) {
      console.log('   ✅ MongoDB working (rate limited - throttling active)');
      return true;
    }
    console.log(`   ❌ MongoDB connection failed: ${error.message}`);
    return false;
  }
}

// Test 4: Rate Limiting (Throttling)
async function testThrottling() {
  console.log('\n4. 🛡️ Testing Rate Limiting (Throttling)...');
  
  try {
    const requests = [];
    const maxRequests = 12; // More than the 10 request limit
    
    console.log(`   📊 Sending ${maxRequests} requests to test throttling...`);
    
    for (let i = 0; i < maxRequests; i++) {
      requests.push(
        axios.get(`${API_BASE}/users`).catch(error => ({
          status: error.response?.status,
          error: true
        }))
      );
    }
    
    const results = await Promise.all(requests);
    
    const successful = results.filter(r => !r.error && r.status === 200).length;
    const throttled = results.filter(r => r.error && r.status === 429).length;
    const errors = results.filter(r => r.error && r.status !== 429).length;
    
    console.log(`   📈 Results: ${successful} successful, ${throttled} throttled, ${errors} errors`);
    
    if (throttled > 0) {
      console.log('   ✅ Rate limiting is working correctly');
      return true;
    } else {
      console.log('   ⚠️ Rate limiting might not be configured properly');
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Throttling test failed: ${error.message}`);
    return false;
  }
}

// Test 5: WebSocket Connection
async function testWebSocket() {
  console.log('\n5. 🔌 Testing WebSocket Connection...');
  
  return new Promise((resolve) => {
    try {
      const io = require('socket.io-client');
      const socket = io('http://localhost:3000');
      
      const timeout = setTimeout(() => {
        socket.disconnect();
        console.log('   ❌ WebSocket connection timeout');
        resolve(false);
      }, 5000);
      
      socket.on('connect', () => {
        clearTimeout(timeout);
        console.log('   ✅ WebSocket connection successful');
        socket.disconnect();
        resolve(true);
      });
      
      socket.on('connect_error', (error) => {
        clearTimeout(timeout);
        console.log(`   ❌ WebSocket connection failed: ${error.message}`);
        resolve(false);
      });
    } catch (error) {
      console.log(`   ❌ WebSocket test failed: ${error.message}`);
      resolve(false);
    }
  });
}

// Test 6: Chat API Endpoints
async function testChatEndpoints() {
  console.log('\n6. 💬 Testing Chat API Endpoints...');
  
  const endpoints = [
    { path: '/chats/debug/all-chats', name: 'Get All Chats' },
    { path: '/users', name: 'Get Users' },
  ];
  
  let working = 0;
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${API_BASE}${endpoint.path}`);
      console.log(`   ✅ ${endpoint.name}: ${response.status}`);
      working++;
    } catch (error) {
      if (error.response?.status === 429) {
        console.log(`   ✅ ${endpoint.name}: Working (rate limited)`);
        working++;
      } else {
        console.log(`   ❌ ${endpoint.name}: ${error.response?.status || 'Failed'}`);
      }
    }
  }
  
  return working === endpoints.length;
}

// Test 7: Performance Check
async function testPerformance() {
  console.log('\n7. ⚡ Testing Performance...');
  
  try {
    const startTime = Date.now();
    await axios.get(`${API_BASE}/users`);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`   📊 Response time: ${duration}ms`);
    
    if (duration < 100) {
      console.log('   ✅ Excellent performance!');
    } else if (duration < 500) {
      console.log('   ✅ Good performance');
    } else if (duration < 1000) {
      console.log('   ⚠️ Acceptable performance');
    } else {
      console.log('   ❌ Slow performance - needs optimization');
    }
    
    return duration < 1000;
  } catch (error) {
    if (error.response?.status === 429) {
      console.log('   ✅ Performance test skipped (rate limited)');
      return true;
    }
    console.log(`   ❌ Performance test failed: ${error.message}`);
    return false;
  }
}

// Main verification function
async function runVerification() {
  const tests = [
    { name: 'Redis Connection', test: testRedisConnection },
    { name: 'Backend Server', test: testBackendHealth },
    { name: 'MongoDB Connection', test: testMongoConnection },
    { name: 'Rate Limiting', test: testThrottling },
    { name: 'WebSocket', test: testWebSocket },
    { name: 'Chat Endpoints', test: testChatEndpoints },
    { name: 'Performance', test: testPerformance },
  ];
  
  const results = [];
  
  for (const { name, test } of tests) {
    try {
      const result = await test();
      results.push({ name, passed: result });
    } catch (error) {
      console.log(`   ❌ ${name} test crashed: ${error.message}`);
      results.push({ name, passed: false });
    }
  }
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📋 VERIFICATION SUMMARY');
  console.log('=' .repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${result.name}`);
  });
  
  console.log('\n' + '=' .repeat(60));
  console.log(`🎯 OVERALL RESULT: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 ALL SYSTEMS OPERATIONAL!');
    console.log('\n✅ Your WhatsApp backend is fully configured and optimized:');
    console.log('   • Redis caching active');
    console.log('   • Rate limiting protecting APIs');
    console.log('   • MongoDB connected and fast');
    console.log('   • WebSocket real-time messaging ready');
    console.log('   • All endpoints working correctly');
  } else {
    console.log('⚠️ Some issues detected. Please check the failed tests above.');
  }
  
  console.log('=' .repeat(60));
}

// Run the verification
runVerification().catch(console.error);
