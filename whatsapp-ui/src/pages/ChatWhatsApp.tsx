import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import socket from '../socket/Socket.io';

interface User {
  _id: string;
  username: string;
  email: string;
  online?: boolean;
}

interface Message {
  _id: string;
  content: string;
  sender: string | User;
  chat: string;
  createdAt: string;
}

interface Chat {
  _id: string;
  users: User[];
  lastMessage?: Message;
  createdAt: string;
}

// Socket is imported from '../socket/Socket.io'

export default function ChatWhatsApp() {
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // State management
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chats' | 'contacts'>('chats');

  // Browser notification function
  const showBrowserNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico', // You can add your app icon here
        tag: 'chat-notification'
      });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(title, {
            body,
            icon: '/favicon.ico',
            tag: 'chat-notification'
          });
        }
      });
    }
  };

  // Request notification permission on component mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Initialize user and socket connection
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }

    const user = localStorage.getItem('user');
    if (!user) {
      navigate('/');
      return;
    }

    const userData = JSON.parse(user);
    setCurrentUser(userData);

    // Initialize socket connection
    const initializeSocket = () => {
      socket.auth = { token };

      socket.on('connect', () => {
        console.log('Socket connected successfully');
        if (userData?._id) {
          socket.emit('setUserOnline', { userId: userData._id });
        }
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
      });

      if (!socket.connected) {
        socket.connect();
        console.log('Attempting socket connection to port 3000...');
      }
    };

    initializeSocket();

    // Fetch initial data
    fetchChats();
    fetchUsers();

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
    };
  }, [navigate]);

  // Socket event listeners
  useEffect(() => {
    const handleNewMessage = (message: Message) => {
      const messageChatId = typeof message.chat === 'string' ? message.chat : (message.chat as any)?._id;

      if (messageChatId === activeChat?._id) {
        setMessages(prev => {
          const exists = prev.some(msg => msg._id === message._id);
          if (!exists) {
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            return [...prev, message];
          }
          return prev;
        });
      }
      fetchChats();
    };

    // Enhanced notification handlers
    const handleMessageNotification = (notificationData: any) => {
      console.log('📱 Message notification received:', notificationData);

      // Show browser notification if user is not on the active chat
      if (notificationData.chatId !== activeChat?._id) {
        showBrowserNotification(
          `New message from ${notificationData.senderInfo?.username || 'Unknown'}`,
          notificationData.content || 'New message received'
        );
      }

      // Update chat list to show new message
      fetchChats();
    };

    const handleChatActivity = (activityData: any) => {
      console.log('💬 Chat activity:', activityData);
      // You can add visual indicators for chat activity here
    };

    const handleGlobalBroadcast = (broadcastData: any) => {
      console.log('📢 Global broadcast:', broadcastData);
      // Handle global broadcasts (announcements, system messages, etc.)
      showBrowserNotification('System Announcement', broadcastData.message);
    };

    const handleUserStatusChange = (data: { userId: string, username?: string, status: 'online' | 'offline' }) => {
      setUsers(prev => prev.map(user =>
        user._id === data.userId ? { ...user, online: data.status === 'online' } : user
      ));
      
      setChats(prev => prev.map(chat => ({
        ...chat,
        users: chat.users.map(user =>
          user._id === data.userId ? { ...user, online: data.status === 'online' } : user
        )
      })));

      if (activeChat) {
        setActiveChat(prev => prev ? ({
          ...prev,
          users: prev.users.map(user =>
            user._id === data.userId ? { ...user, online: data.status === 'online' } : user
          )
        }) : null);
      }
    };

    const handleOnlineUsersUpdate = (data: { onlineUsers: Array<{userId: string, username?: string, email?: string}> }) => {
      const onlineUserIds = data.onlineUsers.map(u => u.userId);
      
      setUsers(prev => prev.map(user => ({
        ...user,
        online: onlineUserIds.includes(user._id)
      })));
      
      setChats(prev => prev.map(chat => ({
        ...chat,
        users: chat.users.map(user => ({
          ...user,
          online: onlineUserIds.includes(user._id)
        }))
      })));

      if (activeChat) {
        setActiveChat(prev => prev ? ({
          ...prev,
          users: prev.users.map(user => ({
            ...user,
            online: onlineUserIds.includes(user._id)
          }))
        }) : null);
      }
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('userStatusChange', handleUserStatusChange);
    socket.on('onlineUsersUpdate', handleOnlineUsersUpdate);

    // Register enhanced notification listeners
    socket.on('messageNotification', handleMessageNotification);
    socket.on('chatActivity', handleChatActivity);
    socket.on('globalBroadcast', handleGlobalBroadcast);

    // Request current online users when component mounts
    socket.emit('getOnlineUsers');

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('userStatusChange', handleUserStatusChange);
      socket.off('onlineUsersUpdate', handleOnlineUsersUpdate);
      socket.off('messageNotification', handleMessageNotification);
      socket.off('chatActivity', handleChatActivity);
      socket.off('globalBroadcast', handleGlobalBroadcast);
    };
  }, [activeChat]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      socket.disconnect();
      console.log('Socket disconnected');
    };
  }, []);

  // Fetch functions
  const fetchChats = async () => {
    try {
      const response = await axios.get('/chats/my-chats');
      setChats(response.data || []);
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get('/users');
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      setUsers(response.data.filter((user: User) => user._id !== currentUser._id));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchMessages = async (chatId: string) => {
    setLoading(true);
    try {
      const response = await axios.get(`/chats/messages/${chatId}`);
      setMessages(response.data || []);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Event handlers
  const handleSelectChat = (chat: Chat) => {
    console.log('🎯 Selected chat:', chat._id);
    setActiveChat(chat);
    fetchMessages(chat._id);
    socket.emit('joinRoom', chat._id);
  };

  const handleCreateChat = async (userId: string) => {
    try {
      console.log('Getting/creating chat with user:', userId);

      // First check if chat already exists in our current chats list
      const existingChat = chats.find((chat) => {
        const otherUser = getOtherUser(chat);
        return otherUser?._id === userId;
      });

      if (existingChat) {
        console.log('Found existing chat in local list:', existingChat._id);
        setActiveChat(existingChat);
        fetchMessages(existingChat._id);
        socket.emit('joinRoom', existingChat._id);
        setActiveTab('chats');
        return;
      }

      const response = await axios.post('/chats/with-user', { userId });
      const { chat, messages } = response.data;

      setActiveChat(chat);
      setMessages(messages || []);
      socket.emit('joinRoom', chat._id);
      setActiveTab('chats');

      // Refresh chats list to show the new chat
      fetchChats();
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !activeChat || !currentUser) return;

    const payload = {
      senderId: currentUser._id,
      chatId: activeChat._id,
      content: newMessage.trim(),
    };

    console.log('Sending message:', payload);
    setNewMessage('');
    socket.emit('sendMessage', payload);

    // Auto-scroll to bottom after sending
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);

    // Refresh chats to update last message
    setTimeout(() => {
      fetchChats();
    }, 500);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    socket.disconnect();
    navigate('/');
  };

  const getOtherUser = (chat: Chat): User | undefined => {
    if (!currentUser) return undefined;
    return chat.users.find((user) => user._id !== currentUser._id) || chat.users[0];
  };

  if (!currentUser) return null;

  return (
    <div className="h-screen bg-gray-100 flex">
      {/* WhatsApp Web Layout */}
      <div className="w-full max-w-7xl mx-auto bg-white shadow-2xl flex">
        
        {/* Left Panel - Chat List */}
        <div className="w-[400px] border-r border-gray-200 flex flex-col">
          
          {/* Header */}
          <div className="bg-gray-100 px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-700">
                    {currentUser.username?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <span className="font-medium text-gray-800">{currentUser.username}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveTab('contacts')}
                  className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                  title="New Chat"
                >
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                  </svg>
                </button>
                
                <button
                  onClick={() => { fetchChats(); fetchUsers(); }}
                  className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                  title="Refresh"
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                  </svg>
                </button>
                
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                  title="Logout"
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="px-3 py-2 bg-white border-b border-gray-200">
            <div className="relative">
              <input
                type="text"
                placeholder="Search or start new chat"
                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:bg-white focus:ring-2 focus:ring-green-500"
              />
              <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 bg-white">
            <button
              onClick={() => setActiveTab('chats')}
              className={`flex-1 py-3 text-sm font-medium ${
                activeTab === 'chats'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Chats
            </button>
            <button
              onClick={() => setActiveTab('contacts')}
              className={`flex-1 py-3 text-sm font-medium ${
                activeTab === 'contacts'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Contacts
            </button>
          </div>

          {/* Chat/Contact List */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'chats' ? (
              // Chat List
              <div>
                {chats.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" className="text-gray-400">
                        <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                      </svg>
                    </div>
                    <p className="text-gray-600 font-medium">No chats yet</p>
                    <p className="text-gray-400 text-sm mt-1">Start a conversation by selecting a contact</p>
                  </div>
                ) : (
                  chats.map((chat) => {
                    const otherUser = getOtherUser(chat);
                    const lastMessage = chat.lastMessage;

                    return (
                      <div
                        key={chat._id}
                        onClick={() => handleSelectChat(chat)}
                        className={`px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                          activeChat?._id === chat._id ? 'bg-gray-100' : ''
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          {/* Profile Picture */}
                          <div className="relative">
                            <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {otherUser?.username?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                            {otherUser?.online && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                            )}
                          </div>

                          {/* Chat Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-medium text-gray-900 truncate">
                                {otherUser?.username || 'Unknown User'}
                              </h3>
                              {lastMessage && (
                                <span className="text-xs text-gray-500">
                                  {new Date(lastMessage.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 truncate mt-1">
                              {lastMessage ? lastMessage.content : 'Start a conversation...'}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              // Contacts List
              <div>
                {users.map((user) => (
                  <div
                    key={user._id}
                    onClick={() => handleCreateChat(user._id)}
                    className="px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-700">
                            {user.username?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        {user.online && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{user.username || 'Unknown'}</h3>
                        <p className="text-sm text-gray-500">
                          {user.online ? 'Online' : 'Offline'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Chat Area */}
        <div className="flex-1 flex flex-col">
          {activeChat ? (
            <>
              {/* Chat Header */}
              <div className="bg-gray-100 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {getOtherUser(activeChat)?.username?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div>
                      <h2 className="font-medium text-gray-900">
                        {getOtherUser(activeChat)?.username || 'Unknown'}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {getOtherUser(activeChat)?.online ? 'Online' : 'Last seen recently'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
                      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                      </svg>
                    </button>
                    <button className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
                      <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div
                className="flex-1 overflow-y-auto p-4"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e5ddd5' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  backgroundColor: '#e5ddd5'
                }}
              >
                {loading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="bg-white px-4 py-2 rounded-lg shadow">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full"></div>
                        <span className="text-gray-600 text-sm">Loading messages...</span>
                      </div>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="text-center bg-white p-6 rounded-lg shadow-sm">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24" className="text-gray-400">
                          <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                        </svg>
                      </div>
                      <p className="text-gray-600 font-medium">No messages yet</p>
                      <p className="text-gray-400 text-sm mt-1">Start the conversation!</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {messages.map((message, index) => {
                      const senderId = typeof message.sender === 'string' ? message.sender : message.sender?._id;
                      const isSender = senderId === currentUser._id;

                      // Check for date separator
                      const messageDate = new Date(message.createdAt).toDateString();
                      const prevMessage = index > 0 ? messages[index - 1] : null;
                      const prevMessageDate = prevMessage ? new Date(prevMessage.createdAt).toDateString() : null;
                      const showDateSeparator = messageDate !== prevMessageDate;

                      return (
                        <div key={message._id}>
                          {/* Date Separator */}
                          {showDateSeparator && (
                            <div className="flex justify-center my-4">
                              <span className="bg-white px-3 py-1 rounded-full text-xs text-gray-500 shadow-sm">
                                {new Date(message.createdAt).toLocaleDateString([], {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>
                          )}

                          {/* Message Bubble */}
                          <div className={`flex ${isSender ? 'justify-end' : 'justify-start'} mb-1`}>
                            <div
                              className={`relative max-w-xs lg:max-w-md px-3 py-2 rounded-lg shadow-sm ${
                                isSender
                                  ? 'bg-green-500 text-white rounded-br-none'
                                  : 'bg-white text-gray-900 rounded-bl-none'
                              }`}
                            >
                              <p className="text-sm leading-relaxed break-words">{message.content}</p>
                              <div className={`flex items-center justify-end mt-1 space-x-1 ${
                                isSender ? 'text-green-100' : 'text-gray-400'
                              }`}>
                                <span className="text-xs">
                                  {new Date(message.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                                {isSender && (
                                  <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                  </svg>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="bg-gray-100 px-4 py-3 border-t border-gray-200">
                <div className="flex items-center space-x-3">
                  <button className="p-2 text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                      <line x1="9" y1="9" x2="9.01" y2="9"/>
                      <line x1="15" y1="9" x2="15.01" y2="9"/>
                    </svg>
                  </button>

                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Type a message"
                      className="w-full px-4 py-3 bg-white rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                    />
                    <button className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-600 hover:bg-gray-200 rounded-full transition-colors">
                      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                      </svg>
                    </button>
                  </div>

                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className={`p-3 rounded-full transition-all ${
                      newMessage.trim()
                        ? 'bg-green-500 hover:bg-green-600 text-white'
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                    </svg>
                  </button>
                </div>
              </div>
            </>
          ) : (
            // Welcome Screen
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg width="48" height="48" fill="currentColor" viewBox="0 0 24 24" className="text-gray-400">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-10.45 8.516-18.944 18.986-18.944 5.151.002 9.999 2.01 13.625 5.652 3.626 3.641 5.621 8.495 5.619 13.65-.003 10.45-8.516 18.944-18.986 18.944h-.008c-1.896 0-3.747-.29-5.438-.839L.057 24z"/>
                  </svg>
                </div>
                <h2 className="text-2xl font-light text-gray-800 mb-2">WhatsApp Web</h2>
                <p className="text-gray-600 mb-4">Send and receive messages without keeping your phone online.</p>
                <p className="text-gray-500 text-sm">Select a chat to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
