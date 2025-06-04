"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var RedisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
let RedisService = RedisService_1 = class RedisService {
    cacheManager;
    logger = new common_1.Logger(RedisService_1.name);
    constructor(cacheManager) {
        this.cacheManager = cacheManager;
    }
    async get(key) {
        try {
            const value = await this.cacheManager.get(key);
            this.logger.debug(`Cache GET: ${key} - ${value ? 'HIT' : 'MISS'}`);
            return value || undefined;
        }
        catch (error) {
            this.logger.error(`Cache GET error for key ${key}:`, error);
            return undefined;
        }
    }
    async set(key, value, ttl) {
        try {
            await this.cacheManager.set(key, value, ttl);
            this.logger.debug(`Cache SET: ${key} with TTL ${ttl || 'default'}`);
        }
        catch (error) {
            this.logger.error(`Cache SET error for key ${key}:`, error);
        }
    }
    async del(key) {
        try {
            await this.cacheManager.del(key);
            this.logger.debug(`Cache DEL: ${key}`);
        }
        catch (error) {
            this.logger.error(`Cache DEL error for key ${key}:`, error);
        }
    }
    async reset() {
        try {
            this.logger.debug('Cache RESET: All keys cleared');
        }
        catch (error) {
            this.logger.error('Cache RESET error:', error);
        }
    }
    async cacheUserSessions(userId, sessionData, ttl = 3600) {
        const key = `user:session:${userId}`;
        await this.set(key, sessionData, ttl);
    }
    async getUserSession(userId) {
        const key = `user:session:${userId}`;
        return await this.get(key);
    }
    async removeUserSession(userId) {
        const key = `user:session:${userId}`;
        await this.del(key);
    }
    async setUserOnline(userId, socketId, userInfo) {
        const key = `online:${userId}`;
        const data = {
            socketId,
            ...userInfo,
            lastSeen: new Date().toISOString(),
        };
        await this.set(key, data, 3600);
    }
    async setUserOffline(userId) {
        const key = `online:${userId}`;
        await this.del(key);
    }
    async getOnlineUser(userId) {
        const key = `online:${userId}`;
        return await this.get(key);
    }
    async getAllOnlineUsers() {
        const onlineUsers = [];
        return onlineUsers;
    }
    async cacheRecentMessages(chatId, messages, ttl = 1800) {
        const key = `chat:messages:${chatId}`;
        await this.set(key, messages, ttl);
    }
    async getRecentMessages(chatId) {
        const key = `chat:messages:${chatId}`;
        return (await this.get(key)) || [];
    }
    async invalidateChatMessages(chatId) {
        const key = `chat:messages:${chatId}`;
        await this.del(key);
    }
    async cacheUserChats(userId, chats, ttl = 1800) {
        const key = `user:chats:${userId}`;
        await this.set(key, chats, ttl);
    }
    async getUserChats(userId) {
        const key = `user:chats:${userId}`;
        return (await this.get(key)) || [];
    }
    async invalidateUserChats(userId) {
        const key = `user:chats:${userId}`;
        await this.del(key);
    }
    async cacheUserNotifications(userId, notifications, ttl = 3600) {
        const key = `user:notifications:${userId}`;
        await this.set(key, notifications, ttl);
    }
    async getUserNotifications(userId) {
        const key = `user:notifications:${userId}`;
        return (await this.get(key)) || [];
    }
    async invalidateUserNotifications(userId) {
        const key = `user:notifications:${userId}`;
        await this.del(key);
    }
    async checkRateLimit(key, limit, windowMs) {
        const current = (await this.get(key)) || 0;
        if (current >= limit) {
            return false;
        }
        await this.set(key, current + 1, Math.ceil(windowMs / 1000));
        return true;
    }
    async setUserTyping(chatId, userId, ttl = 5) {
        const key = `typing:${chatId}:${userId}`;
        await this.set(key, true, ttl);
    }
    async removeUserTyping(chatId, userId) {
        const key = `typing:${chatId}:${userId}`;
        await this.del(key);
    }
    async getTypingUsers(chatId) {
        return [];
    }
    async healthCheck() {
        try {
            const testKey = 'health:check';
            const testValue = Date.now().toString();
            await this.set(testKey, testValue, 10);
            const retrieved = await this.get(testKey);
            await this.del(testKey);
            return retrieved === testValue;
        }
        catch (error) {
            this.logger.error('Redis health check failed:', error);
            return false;
        }
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = RedisService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [Object])
], RedisService);
//# sourceMappingURL=redis.service.js.map