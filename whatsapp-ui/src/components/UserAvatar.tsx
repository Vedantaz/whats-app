import type { User } from '../types/User';

interface UserAvatarProps {
  user?: User;
  size?: 'sm' | 'md' | 'lg';
}

export default function UserAvatar({ user, size = 'md' }: UserAvatarProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  // Get initials from username or email
  const getInitials = () => {
    if (!user) return '?';
    
    if (user.username) {
      return user.username.charAt(0).toUpperCase();
    }
    
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    
    return '?';
  };

  // Generate a consistent color based on user ID
  const getAvatarColor = () => {
    if (!user || !user._id) return 'bg-gray-400';
    
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-teal-500',
    ];
    
    // Use the user ID to pick a consistent color
    const colorIndex = user._id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[colorIndex];
  };

  return (
    <div 
      className={`${sizeClasses[size]} ${getAvatarColor()} rounded-full flex items-center justify-center text-white font-medium`}
    >
      {user?.profilePic ? (
        <img 
          src={user.profilePic} 
          alt={user.username || user.email} 
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        getInitials()
      )}
    </div>
  );
}
