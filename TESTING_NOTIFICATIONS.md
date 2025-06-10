# 🧪 Testing Notification System

## Prerequisites

1. **Backend server running** on port 3000
2. **Frontend running** on port 5173 (or your dev port)
3. **MongoDB running** and connected
4. **At least 2 user accounts** created

## Test Scenarios

### 🔥 Test 1: Basic Message Notifications

**Setup:**
1. Open two browser windows/tabs
2. Login as User A in first tab
3. Login as User B in second tab (or use incognito)

**Steps:**
1. User A creates a chat with User B
2. User A sends a message
3. **Expected Results:**
   - User B should see the message in real-time
   - If User B is not on the chat tab, browser notification should appear
   - Console should show notification events

**Check Console for:**
```javascript
📱 Message notification received: {sender: "UserA", content: "Hello!"}
💬 Chat activity: {type: "new_message", sender: "UserA"}
```

### 🔥 Test 2: Browser Notifications

**Setup:**
1. Ensure browser notifications are enabled
2. Two users logged in different tabs

**Steps:**
1. User A sends message to User B
2. User B is on a different chat or tab
3. **Expected Results:**
   - Browser notification popup should appear
   - Notification should show sender name and message content

**Troubleshooting:**
- Check `Notification.permission` in console
- Manually grant permission if needed

### 🔥 Test 3: Offline User Notifications

**Setup:**
1. User A logged in
2. User B offline (closed browser/tab)

**Steps:**
1. User A sends message to User B
2. Check backend logs for notification storage
3. User B comes online
4. **Expected Results:**
   - Backend should log "storing notification in database"
   - User B should be able to fetch unread notifications

**API Test:**
```bash
# Get unread notifications for user
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/chats/notifications/unread
```

### 🔥 Test 4: Global Broadcasts

**Setup:**
1. Multiple users online

**Steps:**
1. Use test script or admin interface
2. Send global broadcast
3. **Expected Results:**
   - All connected users receive notification
   - Browser notifications appear for all users

### 🔥 Test 5: Socket Event Testing

**Use the manual test script:**
```bash
cd whats-app_backend
node test-notifications-manual.js
```

**Commands to test:**
- `message` - Send test message
- `broadcast` - Send global broadcast
- `join` - Join test room
- `quit` - Exit

## 🔍 Debugging Tools

### 1. Browser Developer Tools

**Console Commands:**
```javascript
// Check notification permission
console.log('Notification permission:', Notification.permission);

// Test browser notification
new Notification('Test', {body: 'This is a test'});

// Check socket connection
console.log('Socket connected:', socket.connected);

// Listen to all socket events
socket.onAny((event, ...args) => {
  console.log('Socket event:', event, args);
});
```

### 2. Backend Logs

**Look for these log messages:**
```
✅ User Alice (user123) is now online with socket abc123
📨 Message sent in chat chat456 by Alice
🔔 Notification sent to online user Bob
💾 User user789 is offline, storing notification in database
```

### 3. Database Inspection

**Check notifications collection:**
```javascript
// In MongoDB shell or Compass
db.notifications.find().sort({createdAt: -1}).limit(10)
```

### 4. Network Tab

**Monitor these requests:**
- WebSocket connection to `ws://localhost:3000`
- Socket.io events in Network tab
- API calls to `/chats/notifications`

## 🚨 Common Issues & Solutions

### Issue: Browser notifications not showing
**Solutions:**
1. Check permission: `Notification.permission`
2. Grant permission manually in browser settings
3. Test with: `new Notification('Test', {body: 'Test'})`

### Issue: Socket events not received
**Solutions:**
1. Check socket connection: `socket.connected`
2. Verify backend server is running
3. Check browser console for connection errors

### Issue: Notifications not stored for offline users
**Solutions:**
1. Check MongoDB connection
2. Verify notification schema is registered
3. Check backend logs for database errors

### Issue: Multiple notifications for same message
**Solutions:**
1. Check for duplicate event listeners
2. Verify proper cleanup in useEffect
3. Check message deduplication logic

## 📊 Expected Behavior Summary

| Scenario | Online User | Offline User | Browser Notification |
|----------|-------------|--------------|---------------------|
| Message sent | ✅ Real-time | ❌ Stored in DB | ✅ If not on chat |
| Global broadcast | ✅ Real-time | ❌ Not stored | ✅ Always |
| User status change | ✅ Real-time | ❌ Not applicable | ❌ No |
| Chat activity | ✅ Real-time | ❌ Not applicable | ❌ No |

## 🎯 Quick Verification Checklist

- [ ] Backend server running on port 3000
- [ ] Frontend connecting to backend
- [ ] Socket.io connection established
- [ ] Browser notification permission granted
- [ ] MongoDB connected and notification schema working
- [ ] Multiple users can send/receive messages
- [ ] Browser notifications appear when not on active chat
- [ ] Offline users get notifications stored in database
- [ ] Global broadcasts reach all connected users
- [ ] Console shows notification events
- [ ] API endpoints return notification data

## 🔧 Advanced Testing

### Load Testing
```bash
# Test with multiple concurrent connections
for i in {1..10}; do
  node test-notifications-manual.js &
done
```

### API Testing with curl
```bash
# Get all notifications
curl -H "Authorization: Bearer TOKEN" \
     http://localhost:3000/chats/notifications

# Mark notification as read
curl -X POST -H "Authorization: Bearer TOKEN" \
     http://localhost:3000/chats/notifications/NOTIFICATION_ID/read
```

### Database Queries
```javascript
// Count unread notifications per user
db.notifications.aggregate([
  {$match: {read: false}},
  {$group: {_id: "$recipient", count: {$sum: 1}}}
])
```
