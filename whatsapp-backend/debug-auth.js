// Debug Authentication Issues
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const axios = require('axios');

const MONGO_URI = 'mongodb://localhost:27017/whatsapp-chat';
const API_BASE = 'http://localhost:3000';

async function debugAuth() {
  console.log('🔍 Debugging Authentication Issues...\n');
  
  let client;
  
  try {
    // Connect to MongoDB
    console.log('1. 🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log('   ✅ Connected successfully!');
    
    const db = client.db('whatsapp-chat');
    const usersCollection = db.collection('users');
    
    // Check existing users
    console.log('\n2. 👥 Checking existing users...');
    const users = await usersCollection.find({}).toArray();
    console.log(`   📊 Found ${users.length} users in database:`);
    
    if (users.length === 0) {
      console.log('   ⚠️  No users found! You need to register first.');
      
      // Create a test user
      console.log('\n3. 👤 Creating test user...');
      const testPassword = 'test123';
      const hashedPassword = await bcrypt.hash(testPassword, 10);
      
      const testUser = {
        username: 'testuser',
        email: 'test@example.com',
        password: hashedPassword,
        profilePic: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const insertResult = await usersCollection.insertOne(testUser);
      console.log('   ✅ Test user created:', insertResult.insertedId);
      console.log('   📧 Email: test@example.com');
      console.log('   🔑 Password: test123');
      
    } else {
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. Email: ${user.email}, Username: ${user.username}`);
        console.log(`      ID: ${user._id}`);
        console.log(`      Password Hash: ${user.password ? 'Present' : 'Missing'}`);
      });
    }
    
    // Test login with API
    console.log('\n4. 🔐 Testing login via API...');
    
    // Get the first user or use test user
    const testEmail = users.length > 0 ? users[0].email : 'test@example.com';
    const testPassword = 'test123'; // You might need to adjust this
    
    console.log(`   📧 Testing with email: ${testEmail}`);
    console.log(`   🔑 Testing with password: ${testPassword}`);
    
    try {
      const loginResponse = await axios.post(`${API_BASE}/auth/login-user`, {
        email: testEmail,
        password: testPassword
      });
      
      console.log('   ✅ Login successful!');
      console.log('   🎫 Token received:', loginResponse.data.access_token ? 'Yes' : 'No');
      console.log('   👤 User data:', loginResponse.data.user);
      
    } catch (loginError) {
      console.log('   ❌ Login failed:', loginError.response?.data?.message || loginError.message);
      
      if (loginError.response?.status === 401) {
        console.log('\n🔍 Debugging password comparison...');
        
        // Get user from database
        const dbUser = await usersCollection.findOne({ email: testEmail });
        if (dbUser) {
          console.log('   📧 User found in database');
          console.log('   🔑 Stored password hash:', dbUser.password);
          
          // Test password comparison
          const isPasswordValid = await bcrypt.compare(testPassword, dbUser.password);
          console.log('   🔐 Password comparison result:', isPasswordValid);
          
          if (!isPasswordValid) {
            console.log('\n💡 Password mismatch detected!');
            console.log('   Possible issues:');
            console.log('   1. Wrong password being used');
            console.log('   2. Password was changed after registration');
            console.log('   3. Hash algorithm mismatch');
            
            // Try to create a new hash with the test password
            console.log('\n🔧 Creating new hash for comparison...');
            const newHash = await bcrypt.hash(testPassword, 10);
            console.log('   New hash:', newHash);
            const newComparison = await bcrypt.compare(testPassword, newHash);
            console.log('   New hash comparison:', newComparison);
          }
        } else {
          console.log('   ❌ User not found in database with email:', testEmail);
        }
      }
    }
    
    // Test registration
    console.log('\n5. 📝 Testing registration...');
    const newUserEmail = `test${Date.now()}@example.com`;
    
    try {
      const registerResponse = await axios.post(`${API_BASE}/auth/register-user`, {
        username: 'newuser',
        email: newUserEmail,
        password: 'newpassword123'
      });
      
      console.log('   ✅ Registration successful!');
      console.log('   👤 New user:', registerResponse.data.user);
      
      // Test login with new user
      console.log('\n6. 🔐 Testing login with new user...');
      const newLoginResponse = await axios.post(`${API_BASE}/auth/login-user`, {
        email: newUserEmail,
        password: 'newpassword123'
      });
      
      console.log('   ✅ New user login successful!');
      console.log('   🎫 Token received:', newLoginResponse.data.access_token ? 'Yes' : 'No');
      
    } catch (regError) {
      console.log('   ❌ Registration failed:', regError.response?.data?.message || regError.message);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Helper function to reset user password
async function resetUserPassword(email, newPassword) {
  console.log(`🔧 Resetting password for ${email}...`);
  
  let client;
  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    
    const db = client.db('whatsapp-chat');
    const usersCollection = db.collection('users');
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const result = await usersCollection.updateOne(
      { email: email },
      { 
        $set: { 
          password: hashedPassword,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log('✅ Password reset successful!');
      console.log(`📧 Email: ${email}`);
      console.log(`🔑 New Password: ${newPassword}`);
    } else {
      console.log('❌ User not found or password not updated');
    }
    
  } catch (error) {
    console.error('❌ Password reset failed:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Check command line arguments
const args = process.argv.slice(2);
if (args[0] === 'reset' && args[1] && args[2]) {
  resetUserPassword(args[1], args[2]);
} else {
  debugAuth();
}

console.log('\n💡 Usage:');
console.log('  node debug-auth.js                    # Debug authentication');
console.log('  node debug-auth.js reset email pass   # Reset user password');
