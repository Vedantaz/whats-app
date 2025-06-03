import { useState, useEffect, useRef } from 'react';
import axios from '../api/axios';
import socket from '../socket/Socket.io';
import type { Chat } from '../types/Chat';
import type { Message } from '../types/Message';
import type { User } from '../types/User';
import UserAvatar from './UserAvatar';

interface ChatWindowProps {
  activeChat: Chat | null;
  onUpdateChat?: (chat: Chat) => void;
}

export default function ChatWindow({ activeChat }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // Common emojis
  const emojis = ['😀', '😂', '😍', '🥰', '😊', '😎', '🤔', '😢', '😭', '😡', '👍', '👎', '❤️', '🔥', '💯', '🎉', '👏', '🙏'];

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  useEffect(() => {
    if (activeChat) {
      fetchMessages();
      socket.emit('joinRoom', activeChat._id);
      console.log('Joined room:', activeChat._id);
    }

    // Listen for new messages
    socket.on('newMessage', (message: Message) => {
      console.log('New message received:', message);
      if (message.chat === activeChat?._id) {
        setMessages(prev => {
          // Check if message already exists to avoid duplicates
          const messageExists = prev.some(msg => msg._id === message._id);
          if (messageExists) {
            return prev;
          }
          return [...prev, message];
        });
      }
    });

    // Listen for user status changes
    socket.on('userStatusChange', (data: { userId: string, status: 'online' | 'offline' }) => {
      console.log('User status change:', data);
      // We'll handle this in the parent component
    });

    return () => {
      socket.off('newMessage');
      socket.off('userStatusChange');
    };
  }, [activeChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showEmojiPicker) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showEmojiPicker]);

  const fetchMessages = async () => {
    if (!activeChat) return;

    try {
      setLoading(true);
      const res = await axios.get(`/chats/messages/${activeChat._id}`);
      console.log('Fetched messages:', res.data);

      // Make sure each message has the correct structure
      const formattedMessages = res.data.map((message: any) => {
        // If sender is just an ID string, convert it to an object
        if (typeof message.sender === 'string') {
          const senderUser = activeChat.users.find(user => user._id === message.sender);
          return {
            ...message,
            sender: senderUser || { _id: message.sender }
          };
        }
        return message;
      });

      setMessages(formattedMessages);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching messages:', error);
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChat) return;

    try {
      const payload = {
        senderId: currentUser._id,
        chatId: activeChat._id,
        content: newMessage,
      };

      console.log('Sending message:', payload);

      // Clear the input immediately
      setNewMessage('');

      // Send the message through socket (don't add optimistically to avoid duplicates)
      socket.emit('sendMessage', payload);
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore the message if there was an error
      setNewMessage(newMessage);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getChatName = () => {
    if (!activeChat) return '';
    const otherUser = activeChat.users.find(user => user._id !== currentUser._id);
    return otherUser ? otherUser.username : 'Chat';
  };

  const getOtherUser = (): User | undefined => {
    if (!activeChat) return undefined;
    return activeChat.users.find(user => user._id !== currentUser._id);
  };

  if (!activeChat) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h3 className="text-xl font-medium text-gray-700">Select a chat to start messaging</h3>
          <p className="text-gray-500 mt-2">Or search for users to start a new conversation</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Chat header - WhatsApp style */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center">
          <UserAvatar user={getOtherUser()} size="md" />
          <div className="ml-3">
            <h3 className="text-lg font-semibold text-gray-900">{getChatName()}</h3>
            <div className="flex items-center">
              <span className={`h-2 w-2 rounded-full mr-2 ${getOtherUser()?.online ? 'bg-green-500' : 'bg-gray-400'}`}></span>
              <p className={`text-sm ${getOtherUser()?.online ? 'text-green-600' : 'text-gray-500'}`}>
                {getOtherUser()?.online ? 'Online' : 'Last seen recently'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-2 rounded-full hover:bg-gray-200 transition-colors flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-gray-600 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </button>
          <button className="p-2 rounded-full hover:bg-gray-200 transition-colors flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-gray-600 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button className="p-2 rounded-full hover:bg-gray-200 transition-colors flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className="text-gray-600 flex-shrink-0">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages area - WhatsApp style */}
      <div
        className="flex-1 overflow-y-auto px-4 py-2"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f0f0f0' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundColor: '#f0f2f5'
        }}
      >
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : (
          <>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <div className="bg-white rounded-full p-6 shadow-lg mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-gray-300 flex-shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-gray-700 mb-2">No messages here yet...</h3>
                <p className="text-gray-500 text-center max-w-sm">
                  Send a message to start the conversation with {getChatName()}
                </p>
              </div>
            ) : (
              <div className="space-y-1 py-4">
                {messages.map((message, index) => {
                  // Ensure sender is a User object
                  const sender = typeof message.sender === 'string'
                    ? { _id: message.sender, username: 'Unknown', email: '' }
                    : message.sender;

                  const isSender = sender._id === currentUser._id;

                  // Check if we should show avatar and timestamp
                  let showAvatar = true;
                  let showTimestamp = true;
                  if (index > 0) {
                    const prevMessage = messages[index - 1];
                    const prevSenderId = typeof prevMessage.sender === 'string'
                      ? prevMessage.sender
                      : prevMessage.sender._id;
                    showAvatar = prevSenderId !== sender._id;

                    // Show timestamp if more than 5 minutes apart
                    const timeDiff = new Date(message.createdAt).getTime() - new Date(prevMessage.createdAt).getTime();
                    showTimestamp = timeDiff > 5 * 60 * 1000; // 5 minutes
                  }

                  return (
                    <div key={message._id} className="mb-1">
                      {showTimestamp && (
                        <div className="text-center my-4">
                          <span className="bg-white px-3 py-1 rounded-full text-xs text-gray-500 shadow-sm">
                            {new Date(message.createdAt).toLocaleDateString() === new Date().toLocaleDateString()
                              ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : new Date(message.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      <div className={`flex items-end mb-1 ${isSender ? 'justify-end' : 'justify-start'}`}>
                        {!isSender && showAvatar && (
                          <div className="flex-shrink-0 mr-2">
                            <UserAvatar user={sender} size="sm" />
                          </div>
                        )}
                        {!isSender && !showAvatar && (
                          <div className="w-8 mr-2"></div>
                        )}
                        <div
                          className={`max-w-[75%] rounded-lg px-3 py-2 shadow-sm ${
                            isSender
                              ? 'bg-green-500 text-white rounded-br-sm'
                              : 'bg-white text-gray-800 rounded-bl-sm'
                          }`}
                        >
                          <p className="text-sm leading-relaxed break-words">{message.content}</p>
                          <div className={`flex items-center justify-end mt-1 space-x-1`}>
                            <span className={`text-xs ${isSender ? 'text-green-100' : 'text-gray-500'}`}>
                              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isSender && (
                              <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20" className="text-green-100 flex-shrink-0">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
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
          </>
        )}
      </div>

      {/* Message input - WhatsApp style */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 relative">
        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="absolute bottom-16 left-4 bg-white rounded-lg shadow-lg border border-gray-200 p-3 z-10">
            <div className="grid grid-cols-6 gap-2 max-w-xs">
              {emojis.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => addEmoji(emoji)}
                  className="text-xl hover:bg-gray-100 rounded p-1 transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-end space-x-2">
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button className="p-2 text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          <div className="flex-1 bg-white rounded-full border border-gray-300 flex items-center">
            <input
              type="text"
              placeholder="Type a message"
              className="flex-1 px-4 py-2 bg-transparent focus:outline-none text-sm"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!newMessage.trim()}
            className={`p-2 rounded-full transition-all flex-shrink-0 ${
              newMessage.trim()
                ? 'bg-green-500 text-white hover:bg-green-600 scale-100'
                : 'bg-gray-300 text-gray-500 scale-95'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
