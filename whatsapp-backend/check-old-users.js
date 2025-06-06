// Check Old Users and Password Issues
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGO_URI = 'mongodb://localhost:27017/whatsapp-chat';

async function checkOldUsers() {
  console.log('🔍 Analyzing Old User Login Issues...\n');
  
  let client;
  
  try {
    client = new MongoClient(MONGO_URI);
    await client.connect();
    
    const db = client.db('whatsapp-chat');
    const usersCollection = db.collection('users');
    
    // Get all users
    const users = await usersCollection.find({}).toArray();
    console.log(`📊 Found ${users.length} users in database:\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. 👤 User Analysis:`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   👤 Username: ${user.username}`);
      console.log(`   🆔 ID: ${user._id}`);
      console.log(`   📅 Created: ${user.createdAt || 'Unknown'}`);
      console.log(`   🔑 Password Hash: ${user.password ? 'Present' : '❌ MISSING!'}`);
      
      if (user.password) {
        // Check hash format
        const hashLength = user.password.length;
        const isValidBcryptHash = user.password.startsWith('$2a$') || user.password.startsWith('$2b$');
        
        console.log(`   🔐 Hash Length: ${hashLength} chars`);
        console.log(`   ✅ Valid bcrypt format: ${isValidBcryptHash ? 'Yes' : '❌ NO - This is the problem!'}`);
        
        if (!isValidBcryptHash) {
          console.log(`   ⚠️  ISSUE: Password appears to be plain text or wrong format!`);
        }
      }
      console.log('');
    });
    
    // Check for password format issues
    const usersWithBadPasswords = users.filter(user => 
      user.password && !(user.password.startsWith('$2a$') || user.password.startsWith('$2b$'))
    );
    
    if (usersWithBadPasswords.length > 0) {
      console.log('🚨 PROBLEM IDENTIFIED:');
      console.log(`   ${usersWithBadPasswords.length} users have invalid password hashes!`);
      console.log('   This happens when:');
      console.log('   1. Passwords were stored as plain text');
      console.log('   2. Different hashing algorithm was used');
      console.log('   3. Database migration issues');
      console.log('   4. Manual data insertion without proper hashing');
      
      console.log('\n💡 SOLUTION: Reset passwords for these users');
      
      for (const user of usersWithBadPasswords) {
        console.log(`\n🔧 Fixing user: ${user.email}`);
        
        // Create a new hash with a default password
        const defaultPassword = 'password123';
        const newHash = await bcrypt.hash(defaultPassword, 10);
        
        await usersCollection.updateOne(
          { _id: user._id },
          { 
            $set: { 
              password: newHash,
              updatedAt: new Date()
            }
          }
        );
        
        console.log(`   ✅ Password reset to: ${defaultPassword}`);
        console.log(`   🔐 New hash: ${newHash.substring(0, 20)}...`);
      }
      
      console.log('\n🎉 All old users fixed! They can now login with password: password123');
    } else {
      console.log('✅ All users have valid password hashes');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

checkOldUsers();
