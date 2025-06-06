// Direct MongoDB Connection Test
const { MongoClient } = require('mongodb');

const MONGO_URI = 'mongodb://localhost:27017/whatsapp-chat';

async function testMongoConnection() {
  console.log('🧪 Testing Direct MongoDB Connection...\n');
  
  let client;
  
  try {
    console.log('1. 🔌 Connecting to MongoDB...');
    client = new MongoClient(MONGO_URI);
    await client.connect();
    console.log('   ✅ Connected successfully!');
    
    console.log('\n2. 📊 Testing database operations...');
    const db = client.db('whatsapp-chat');
    
    // Test write
    const testCollection = db.collection('connection-test');
    const testDoc = { timestamp: new Date(), test: 'connection-test' };
    const insertResult = await testCollection.insertOne(testDoc);
    console.log('   ✅ Write test successful:', insertResult.insertedId);
    
    // Test read
    const foundDoc = await testCollection.findOne({ _id: insertResult.insertedId });
    console.log('   ✅ Read test successful:', foundDoc ? 'Document found' : 'Document not found');
    
    // Test collections
    const collections = await db.listCollections().toArray();
    console.log(`   ✅ Found ${collections.length} collections:`, collections.map(c => c.name).join(', '));
    
    // Cleanup
    await testCollection.deleteOne({ _id: insertResult.insertedId });
    console.log('   ✅ Cleanup successful');
    
    console.log('\n🎉 MongoDB connection is working perfectly!');
    return true;
    
  } catch (error) {
    console.error('\n❌ MongoDB connection failed:', error.message);
    return false;
  } finally {
    if (client) {
      await client.close();
    }
  }
}

testMongoConnection().then(success => {
  if (success) {
    console.log('\n✅ Your MongoDB setup is perfect for the chat application!');
  } else {
    console.log('\n❌ MongoDB needs to be fixed before the chat app will work.');
  }
});
