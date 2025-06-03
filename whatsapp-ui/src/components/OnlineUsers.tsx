import { useState, useEffect } from 'react';
import axios from '../api/axios';
import socket from '../socket/Socket.io';
import { type User } from '../types/User';
import UserAvatar from './UserAvatar';

interface OnlineUsersProps {
  onSelectUser: (userId: string) => void;
}

export default function OnlineUsers({ onSelectUser }: OnlineUsersProps) {
  const [onlineUsers, setOnlineUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchOnlineUsers();

    // Listen for user status changes
    socket.on('userStatusChange', (data: { userName:string, userId: string, status: 'online' | 'offline' }) => {
      setOnlineUsers(prev => {
        if (data.status === 'online') {
          // Add user to online users if not already there
          if (!prev.some(user => user._id === data.userId)) {
            return [...prev, { _id: data.userId, online: true } as User];
          }
        } else {
          // Remove user from online users
          return prev.filter(user => user._id !== data.userId);
        }
        return prev;
      });
    });

    return () => {
      socket.off('userStatusChange');
    };
  }, []);

  const fetchOnlineUsers = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/users/online');
      // Filter out current user
      setOnlineUsers(res.data.filter((user: User) => user._id !== currentUser._id));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching online users:', error);
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 p-3">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Online Users</h3>
      
      {loading ? (
        <div className="flex justify-center py-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {onlineUsers.length > 0 ? (
            onlineUsers.map(user => (
              <div 
                key={user._id} 
                className="flex flex-col items-center cursor-pointer"
                onClick={() => onSelectUser(user._id)}
              >
                <div className="relative">
                  <UserAvatar user={user} size="sm" />
                  <span className="absolute bottom-0 right-0 h-2 w-2 bg-green-500 rounded-full border border-white"></span>
                </div>
                <span className="text-xs mt-1 truncate w-12 text-center">
                  {user.username || (user.email ? user.email.split('@')[0] : 'User')}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-500">No users online</p>
          )}
        </div>
      )}
    </div>
  );
}
