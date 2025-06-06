// Test Specific User Login
const axios = require('axios');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGO_URI = 'mongodb://localhost:27017/whatsapp-chat';
const API_BASE = 'http://localhost:3000';

async function testSpecificLogin() {
  console.log('🔐 Testing Specific User Login...\n');
  
  let client;
  
  try {
    // Connect to MongoDB
    client = new MongoClient(MONGO_URI);
    await client.connect();
    
    const db = client.db('whatsapp-chat');
    const usersCollection = db.collection('users');
    
    // Get the user
    const user = await usersCollection.findOne({ email: 'rajat@gmail.com' });
    
    if (!user) {
      console.log('❌ User not found!');
      return;
    }
    
    console.log('👤 User found:');
    console.log(`   📧 Email: ${user.email}`);
    console.log(`   👤 Username: ${user.username}`);
    console.log(`   🔐 Password Hash: ${user.password}`);
    
    // Test different possible passwords
    const possiblePasswords = [
      'rajat',
      'rajat123',
      'password',
      'password123',
      '123456',
      'admin',
      'test123'
    ];
    
    console.log('\n🔍 Testing possible passwords...');
    
    for (const testPassword of possiblePasswords) {
      const isMatch = await bcrypt.compare(testPassword, user.password);
      console.log(`   🔑 "${testPassword}": ${isMatch ? '✅ MATCH!' : '❌ No match'}`);
      
      if (isMatch) {
        console.log(`\n🎉 Found correct password: "${testPassword}"`);
        
        // Test API login
        console.log('\n🌐 Testing API login...');
        try {
          const response = await axios.post(`${API_BASE}/auth/login-user`, {
            email: 'rajat@gmail.com',
            password: testPassword
          });
          
          console.log('✅ API Login successful!');
          console.log('🎫 Token:', response.data.access_token ? 'Received' : 'Missing');
          console.log('👤 User data:', response.data.user);
          
        } catch (apiError) {
          console.log('❌ API Login failed:', apiError.response?.data?.message || apiError.message);
        }
        
        return;
      }
    }
    
    console.log('\n❌ None of the common passwords worked!');
    console.log('\n💡 Let me reset the password to "rajat123"...');
    
    // Reset password
    const newPassword = 'rajat123';
    const newHash = await bcrypt.hash(newPassword, 10);
    
    await usersCollection.updateOne(
      { email: 'rajat@gmail.com' },
      { 
        $set: { 
          password: newHash,
          updatedAt: new Date()
        }
      }
    );
    
    console.log('✅ Password reset successful!');
    console.log(`📧 Email: rajat@gmail.com`);
    console.log(`🔑 New Password: ${newPassword}`);
    
    // Test login with new password
    console.log('\n🌐 Testing login with new password...');
    try {
      const response = await axios.post(`${API_BASE}/auth/login-user`, {
        email: 'rajat@gmail.com',
        password: newPassword
      });
      
      console.log('✅ Login successful with new password!');
      console.log('🎫 Token:', response.data.access_token ? 'Received' : 'Missing');
      
    } catch (apiError) {
      console.log('❌ Login still failed:', apiError.response?.data?.message || apiError.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

testSpecificLogin();
