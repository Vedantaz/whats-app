// Browser console testing script
// Copy and paste this into your browser console while using the chat app

console.log('🧪 Notification Testing Tools Loaded');

// Test browser notifications
window.testBrowserNotification = () => {
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification('Test Notification', {
        body: 'This is a test notification from the chat app',
        icon: '/favicon.ico',
        tag: 'test-notification'
      });
      console.log('✅ Test notification sent');
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification('Permission Granted', {
            body: 'Notifications are now enabled!',
            icon: '/favicon.ico'
          });
        }
      });
    } else {
      console.log('❌ Notifications are blocked');
    }
  } else {
    console.log('❌ Browser does not support notifications');
  }
};

// Monitor all socket events
window.monitorSocketEvents = () => {
  if (window.socket) {
    console.log('📡 Monitoring socket events...');
    
    // Listen to all events
    window.socket.onAny((event, ...args) => {
      console.log(`🔔 Socket Event: ${event}`, args);
    });
    
    // Specific notification events
    const events = [
      'newMessage',
      'messageNotification', 
      'chatActivity',
      'globalBroadcast',
      'userStatusChange',
      'onlineUsersUpdate'
    ];
    
    events.forEach(event => {
      window.socket.on(event, (data) => {
        console.log(`📨 ${event}:`, data);
      });
    });
    
    console.log('✅ Socket monitoring enabled');
  } else {
    console.log('❌ Socket not found. Make sure you are on the chat page.');
  }
};

// Test sending a message
window.testSendMessage = (content = 'Test notification message') => {
  if (window.socket && window.socket.connected) {
    const testMessage = {
      senderId: 'test-user-' + Date.now(),
      chatId: 'test-chat-' + Date.now(),
      content: content
    };
    
    console.log('📤 Sending test message:', testMessage);
    window.socket.emit('sendMessage', testMessage);
  } else {
    console.log('❌ Socket not connected');
  }
};

// Test global broadcast
window.testGlobalBroadcast = (message = 'Test global announcement') => {
  if (window.socket && window.socket.connected) {
    const broadcast = {
      message: message,
      type: 'test-announcement'
    };
    
    console.log('📢 Sending global broadcast:', broadcast);
    window.socket.emit('broadcastToAll', broadcast);
  } else {
    console.log('❌ Socket not connected');
  }
};

// Check notification status
window.checkNotificationStatus = () => {
  console.log('🔍 Notification Status Check:');
  console.log('Browser support:', 'Notification' in window);
  console.log('Permission:', Notification.permission);
  console.log('Socket connected:', window.socket?.connected || false);
  console.log('Socket ID:', window.socket?.id || 'Not connected');
  
  if (window.socket) {
    console.log('Socket events:', Object.keys(window.socket._callbacks || {}));
  }
};

// Fetch notifications via API
window.fetchNotifications = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('❌ No auth token found');
      return;
    }
    
    const response = await fetch('/api/chats/notifications', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const notifications = await response.json();
      console.log('📬 User notifications:', notifications);
      return notifications;
    } else {
      console.log('❌ Failed to fetch notifications:', response.status);
    }
  } catch (error) {
    console.log('❌ Error fetching notifications:', error);
  }
};

// Display help
window.showNotificationTestHelp = () => {
  console.log(`
🧪 Notification Testing Commands:

testBrowserNotification()     - Test browser notification popup
monitorSocketEvents()         - Monitor all socket events in console  
testSendMessage()            - Send a test message
testGlobalBroadcast()        - Send a test global broadcast
checkNotificationStatus()     - Check notification and socket status
fetchNotifications()         - Fetch user notifications via API
showNotificationTestHelp()   - Show this help

Example usage:
> testBrowserNotification()
> monitorSocketEvents()
> testSendMessage('Hello from console!')
> checkNotificationStatus()
  `);
};

// Auto-run status check
window.checkNotificationStatus();
console.log('💡 Type showNotificationTestHelp() for available commands');

// Make socket globally available if it exists
if (typeof socket !== 'undefined') {
  window.socket = socket;
}
