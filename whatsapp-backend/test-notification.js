// Simple test script to demonstrate notification functionality
// Run this with: node test-notification.js

const io = require('socket.io-client');

// Test configuration
const SERVER_URL = 'http://localhost:3000';
const TEST_USERS = [
  { id: 'user1', username: 'Alice', token: 'test-token-1' },
  { id: 'user2', username: 'Bob', token: 'test-token-2' }
];

console.log('🧪 Starting Notification System Test...\n');

// Create socket connections for test users
const sockets = TEST_USERS.map(user => {
  const socket = io(SERVER_URL, {
    auth: { token: user.token },
    autoConnect: false
  });

  socket.on('connect', () => {
    console.log(`✅ ${user.username} connected`);
    socket.emit('setUserOnline', { userId: user.id });
  });

  socket.on('connect_error', (error) => {
    console.log(`❌ ${user.username} connection error:`, error.message);
  });

  // Listen for various notification events
  socket.on('newMessage', (data) => {
    console.log(`📨 ${user.username} received newMessage:`, {
      from: data.senderInfo?.username,
      content: data.content,
      type: data.type
    });
  });

  socket.on('messageNotification', (data) => {
    console.log(`🔔 ${user.username} received messageNotification:`, {
      from: data.senderInfo?.username,
      content: data.content,
      isDirectNotification: data.isDirectNotification
    });
  });

  socket.on('chatActivity', (data) => {
    console.log(`💬 ${user.username} received chatActivity:`, {
      chatId: data.chatId,
      type: data.type,
      from: data.senderInfo?.username
    });
  });

  socket.on('globalBroadcast', (data) => {
    console.log(`📢 ${user.username} received globalBroadcast:`, {
      message: data.message,
      type: data.type
    });
  });

  socket.on('userStatusChange', (data) => {
    console.log(`👤 ${user.username} received userStatusChange:`, {
      userId: data.userId,
      username: data.username,
      status: data.status
    });
  });

  return { ...user, socket };
});

// Test scenarios
async function runTests() {
  console.log('🚀 Connecting test users...\n');
  
  // Connect all users
  sockets.forEach(user => user.socket.connect());
  
  // Wait for connections
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log('\n📝 Test 1: Sending a message (should trigger notifications)...\n');
  
  // Test message sending
  const testMessage = {
    senderId: TEST_USERS[0].id,
    chatId: 'test-chat-id-123',
    content: 'Hello! This is a test notification message.'
  };
  
  sockets[0].socket.emit('sendMessage', testMessage);
  
  // Wait for message processing
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('\n📢 Test 2: Global broadcast test...\n');
  
  // Test global broadcast
  sockets[0].socket.emit('broadcastToAll', {
    message: 'This is a system-wide announcement!',
    type: 'announcement'
  });
  
  // Wait for broadcast processing
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('\n✅ Tests completed! Check the logs above for notification events.\n');
  console.log('💡 Note: Some notifications may not work without proper authentication and database setup.\n');
  
  // Cleanup
  setTimeout(() => {
    console.log('🧹 Cleaning up connections...');
    sockets.forEach(user => user.socket.disconnect());
    process.exit(0);
  }, 2000);
}

// Start tests
runTests().catch(console.error);
