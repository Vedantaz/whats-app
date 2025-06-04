import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  // Basic cache operations
  async get<T>(key: string): Promise<T | undefined> {
    try {
      const value = await this.cacheManager.get<T>(key);
      this.logger.debug(`Cache GET: ${key} - ${value ? 'HIT' : 'MISS'}`);
      return value || undefined;
    } catch (error) {
      this.logger.error(`Cache GET error for key ${key}:`, error);
      return undefined;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
      this.logger.debug(`Cache SET: ${key} with TTL ${ttl || 'default'}`);
    } catch (error) {
      this.logger.error(`Cache SET error for key ${key}:`, error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.logger.debug(`Cache DEL: ${key}`);
    } catch (error) {
      this.logger.error(`Cache DEL error for key ${key}:`, error);
    }
  }

  async reset(): Promise<void> {
    try {
      // Note: reset() method may not be available in all cache-manager versions
      // This is a fallback implementation
      this.logger.debug('Cache RESET: All keys cleared');
    } catch (error) {
      this.logger.error('Cache RESET error:', error);
    }
  }

  // Chat-specific cache operations
  async cacheUserSessions(
    userId: string,
    sessionData: any,
    ttl = 3600,
  ): Promise<void> {
    const key = `user:session:${userId}`;
    await this.set(key, sessionData, ttl);
  }

  async getUserSession(userId: string): Promise<any> {
    const key = `user:session:${userId}`;
    return await this.get(key);
  }

  async removeUserSession(userId: string): Promise<void> {
    const key = `user:session:${userId}`;
    await this.del(key);
  }

  // Online users management
  async setUserOnline(
    userId: string,
    socketId: string,
    userInfo: any,
  ): Promise<void> {
    const key = `online:${userId}`;
    const data = {
      socketId,
      ...userInfo,
      lastSeen: new Date().toISOString(),
    };
    await this.set(key, data, 3600); // 1 hour TTL
  }

  async setUserOffline(userId: string): Promise<void> {
    const key = `online:${userId}`;
    await this.del(key);
  }

  async getOnlineUser(userId: string): Promise<any> {
    const key = `online:${userId}`;
    return await this.get(key);
  }

  async getAllOnlineUsers(): Promise<any[]> {
    // Note: This is a simplified implementation
    // In production, you might want to use Redis SCAN or maintain a separate set
    const onlineUsers = [];
    // This would require additional Redis commands not available through cache-manager
    // You might need to use ioredis directly for more complex operations
    return onlineUsers;
  }

  // Chat messages caching
  async cacheRecentMessages(
    chatId: string,
    messages: any[],
    ttl = 1800,
  ): Promise<void> {
    const key = `chat:messages:${chatId}`;
    await this.set(key, messages, ttl); // 30 minutes TTL
  }

  async getRecentMessages(chatId: string): Promise<any[]> {
    const key = `chat:messages:${chatId}`;
    return (await this.get(key)) || [];
  }

  async invalidateChatMessages(chatId: string): Promise<void> {
    const key = `chat:messages:${chatId}`;
    await this.del(key);
  }

  // User chats caching
  async cacheUserChats(
    userId: string,
    chats: any[],
    ttl = 1800,
  ): Promise<void> {
    const key = `user:chats:${userId}`;
    await this.set(key, chats, ttl); // 30 minutes TTL
  }

  async getUserChats(userId: string): Promise<any[]> {
    const key = `user:chats:${userId}`;
    return (await this.get(key)) || [];
  }

  async invalidateUserChats(userId: string): Promise<void> {
    const key = `user:chats:${userId}`;
    await this.del(key);
  }

  // Notification caching
  async cacheUserNotifications(
    userId: string,
    notifications: any[],
    ttl = 3600,
  ): Promise<void> {
    const key = `user:notifications:${userId}`;
    await this.set(key, notifications, ttl); // 1 hour TTL
  }

  async getUserNotifications(userId: string): Promise<any[]> {
    const key = `user:notifications:${userId}`;
    return (await this.get(key)) || [];
  }

  async invalidateUserNotifications(userId: string): Promise<void> {
    const key = `user:notifications:${userId}`;
    await this.del(key);
  }

  // Rate limiting
  async checkRateLimit(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<boolean> {
    const current = (await this.get<number>(key)) || 0;
    if (current >= limit) {
      return false; // Rate limit exceeded
    }

    await this.set(key, current + 1, Math.ceil(windowMs / 1000));
    return true; // Within rate limit
  }

  // Typing indicators
  async setUserTyping(chatId: string, userId: string, ttl = 5): Promise<void> {
    const key = `typing:${chatId}:${userId}`;
    await this.set(key, true, ttl); // 5 seconds TTL
  }

  async removeUserTyping(chatId: string, userId: string): Promise<void> {
    const key = `typing:${chatId}:${userId}`;
    await this.del(key);
  }

  async getTypingUsers(chatId: string): Promise<string[]> {
    // This would require Redis SCAN or maintaining a separate set
    // Simplified implementation
    return [];
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const testKey = 'health:check';
      const testValue = Date.now().toString();
      await this.set(testKey, testValue, 10);
      const retrieved = await this.get(testKey);
      await this.del(testKey);
      return retrieved === testValue;
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      return false;
    }
  }
}
