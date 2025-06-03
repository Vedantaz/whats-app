import { useState, useEffect } from 'react';
import axios from '../api/axios';
import socket from '../socket/Socket.io';
import type { User } from '../types/User';
import type { Chat } from '../types/Chat';
import UserAvatar from './UserAvatar';

interface SidebarProps {
  onSelectChat: (chat: Chat) => void;
  onCreateChat: (userId: string) => void;
  activeChat: Chat | null;
  onLogout: () => void;
}

export default function Sidebar({ onSelectChat, onCreateChat, activeChat, onLogout }: SidebarProps) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUsers, setShowUsers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chats' | 'users'>('chats');
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchChats();
    fetchAllUsers();

    // Listen for user status changes
    socket.on('userStatusChange', (data: { userId: string, status: 'online' | 'offline' }) => {
      setAllUsers(prev =>
        prev.map(user =>
          user._id === data.userId
            ? { ...user, online: data.status === 'online' }
            : user
        )
      );
    });

    return () => {
      socket.off('userStatusChange');
    };
  }, []);

  const fetchChats = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/chats/user/${currentUser._id}`);
      setChats(res.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching chats:', error);
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await axios.get('/users');
      // Filter out current user and set initial online status to false
      const filteredUsers = res.data
        .filter((user: User) => user._id !== currentUser._id)
        .map((user: User) => ({ ...user, online: false }));
      setAllUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching all users:', error);
    }
  };

  const searchUsers = async () => {
    try {
      if (searchQuery.trim()) {
        const res = await axios.get(`/users/search?query=${searchQuery}`);
        // Filter out current user from results
        setUsers(res.data.filter((user: User) => user._id !== currentUser._id));
      } else {
        setUsers(allUsers);
      }
      setShowUsers(true);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleCreateChat = async (userId: string) => {
    onCreateChat(userId);
    setShowUsers(false);
    setSearchQuery('');
    // Refresh chats after creating a new one
    setTimeout(() => {
      fetchChats();
    }, 1000);
  };

  const getChatName = (chat: Chat) => {
    const otherUser = chat.users.find(user => user._id !== currentUser._id);
    return otherUser ? otherUser.username : 'Chat';
  };

  return (
    <div className="w-full md:w-80 h-full bg-white border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 bg-green-600 text-white">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-bold">WhatsApp</h2>
          <div className="flex space-x-1">
            <button className="p-1 rounded-full hover:bg-green-700 transition-colors flex-shrink-0" title="New Chat">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
            <button
              onClick={onLogout}
              className="p-1 rounded-full hover:bg-green-700 transition-colors flex-shrink-0"
              title="Logout"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="currentColor" className="text-gray-400 flex-shrink-0">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search or start new chat"
            className="w-full pl-10 pr-3 py-2 bg-white bg-opacity-20 text-white placeholder-green-100 rounded-lg focus:outline-none focus:bg-white focus:text-gray-900 focus:placeholder-gray-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-50 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('chats')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'chats'
              ? 'text-green-600 border-b-2 border-green-600 bg-white'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Chats
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'users'
              ? 'text-green-600 border-b-2 border-green-600 bg-white'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Contacts
        </button>
      </div>

      {showUsers && (
        <div className="p-2 bg-gray-100">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-700">Search Results</h3>
            <button
              onClick={() => setShowUsers(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          <ul className="space-y-1">
            {users.map((user) => (
              <li
                key={user._id}
                className="p-2 hover:bg-gray-200 rounded-md cursor-pointer flex items-center"
                onClick={() => handleCreateChat(user._id)}
              >
                <UserAvatar user={user} size="sm" />
                <div className="ml-2 flex-1">
                  <span className="font-medium">{user.username || user.email}</span>
                  <div className="flex items-center">
                    <span className={`h-2 w-2 rounded-full mr-1 ${user.online ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                    <span className="text-xs text-gray-500">{user.online ? 'Online' : 'Offline'}</span>
                  </div>
                </div>
              </li>
            ))}
            {users.length === 0 && (
              <li className="p-2 text-gray-500 text-sm">No users found</li>
            )}
          </ul>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-20">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
          </div>
        ) : activeTab === 'chats' ? (
          <div className="divide-y divide-gray-100">
            {chats.map((chat) => {
              const otherUser = chat.users.find(user => user._id !== currentUser._id) || chat.users[0];
              return (
                <div
                  key={chat._id}
                  className={`px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                    activeChat?._id === chat._id ? 'bg-green-50 border-r-4 border-green-500' : ''
                  }`}
                  onClick={() => onSelectChat(chat)}
                >
                  <div className="flex items-center">
                    <div className="relative">
                      <UserAvatar user={otherUser} size="md" />
                      {otherUser?.online && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white rounded-full"></span>
                      )}
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {getChatName(chat)}
                        </h3>
                        {chat.lastMessage && (
                          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                            {new Date(chat.lastMessage.createdAt).toLocaleDateString() === new Date().toLocaleDateString()
                              ? new Date(chat.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : new Date(chat.lastMessage.createdAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {chat.lastMessage ? chat.lastMessage.content : 'Tap to start messaging'}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
            {chats.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-gray-300 mb-3 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm font-medium">No chats yet</p>
                <p className="text-xs text-center mt-1">Start a conversation by selecting a contact</p>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {allUsers.map((user) => (
              <div
                key={user._id}
                className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleCreateChat(user._id)}
              >
                <div className="flex items-center">
                  <div className="relative">
                    <UserAvatar user={user} size="md" />
                    {user.online && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>
                  <div className="ml-3 flex-1">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-semibold text-gray-900">
                        {user.username || user.email.split('@')[0]}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        user.online
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {user.online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {allUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="text-gray-300 mb-3 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
                <p className="text-sm font-medium">No contacts found</p>
                <p className="text-xs text-center mt-1">Try refreshing or check your connection</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
