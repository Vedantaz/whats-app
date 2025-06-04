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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const chats_service_1 = require("./chats.service");
const join_room_dto_1 = require("./dto/join-room.dto");
const throttler_decorators_1 = require("../throttler/throttler.decorators");
let ChatsController = class ChatsController {
    chatsService;
    constructor(chatsService) {
        this.chatsService = chatsService;
    }
    getMyChats(req) {
        const userId = req.user._id;
        return this.chatsService.getUserChats(userId);
    }
    getUserChats(userId) {
        console.log('Getting chats for user:', userId);
        return this.chatsService.getUserChats(userId);
    }
    async createChatRoom(req, body) {
        const currentUserId = req.user._id;
        const receiverId = body.receiverId;
        const senderId = body.senderId || currentUserId;
        console.log('Create chat request body:', body);
        console.log('Current user ID:', currentUserId);
        console.log('Sender ID:', senderId);
        console.log('Receiver ID:', receiverId);
        if (!receiverId) {
            throw new common_1.BadRequestException('receiverId is required in request body.');
        }
        if (senderId === receiverId) {
            throw new common_1.BadRequestException('Cannot create chat with yourself.');
        }
        const chat = await this.chatsService.createOrGetChatRoom(senderId, receiverId);
        return chat;
    }
    async getChatWithUser(req, body) {
        const currentUserId = req.user._id;
        if (!body.userId) {
            throw new common_1.BadRequestException('userId is required in request body.');
        }
        if (currentUserId === body.userId) {
            throw new common_1.BadRequestException('Cannot create chat with yourself.');
        }
        console.log('Getting/creating chat between:', currentUserId, 'and', body.userId);
        const chat = await this.chatsService.createOrGetChatRoom(currentUserId, body.userId);
        const messages = await this.chatsService.getMessages(String(chat._id));
        return {
            chat,
            messages,
        };
    }
    async joinRoom(req, body) {
        const userId = req.user._id;
        if (!userId || !body.chatId) {
            throw new common_1.BadRequestException('User ID or Chat ID is missing.');
        }
        return await this.chatsService.joinRoom(userId, body);
    }
    async sendMessage(body) {
        if (!body.senderId || !body.chatId || !body.content) {
            throw new common_1.BadRequestException('Sender ID, Chat ID, or Content is missing.');
        }
        const message = await this.chatsService.sendMessage(body.senderId, body.chatId, body.content);
        return message;
    }
    async cleanupDuplicateChats() {
        return this.chatsService.cleanupDuplicateChats();
    }
    async getAllChatsDebug() {
        return this.chatsService.getAllChatsDebug();
    }
    async getMessages(chatId, limit, skip) {
        try {
            console.log('🔍 Getting messages for chat:', chatId);
            const messageLimit = limit ? parseInt(limit) : 50;
            const messageSkip = skip ? parseInt(skip) : 0;
            const startTime = Date.now();
            const messages = await this.chatsService.getMessages(chatId, messageLimit, messageSkip);
            const duration = Date.now() - startTime;
            console.log(`✅ Fetched ${messages.length} messages in ${duration}ms`);
            return messages;
        }
        catch (error) {
            console.error('❌ Error fetching messages:', error);
            throw error;
        }
    }
    async getUserNotifications(req) {
        const userId = req.user._id;
        return await this.chatsService.getUserNotifications(userId);
    }
    async getUnreadNotifications(req) {
        const userId = req.user._id;
        return await this.chatsService.getUserNotifications(userId, true);
    }
    async markNotificationAsRead(notificationId) {
        await this.chatsService.markNotificationAsRead(notificationId);
        return { status: 'success', message: 'Notification marked as read' };
    }
    async markNotificationAsDelivered(notificationId) {
        await this.chatsService.markNotificationAsDelivered(notificationId);
        return { status: 'success', message: 'Notification marked as delivered' };
    }
};
exports.ChatsController = ChatsController;
__decorate([
    (0, common_1.Get)('my-chats'),
    (0, throttler_decorators_1.LenientThrottle)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ChatsController.prototype, "getMyChats", null);
__decorate([
    (0, common_1.Get)('user/:userId'),
    (0, throttler_decorators_1.LenientThrottle)(),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ChatsController.prototype, "getUserChats", null);
__decorate([
    (0, common_1.Post)('create'),
    (0, throttler_decorators_1.StandardThrottle)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "createChatRoom", null);
__decorate([
    (0, common_1.Post)('with-user'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "getChatWithUser", null);
__decorate([
    (0, common_1.Post)('join'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, join_room_dto_1.JoinRoomDto]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "joinRoom", null);
__decorate([
    (0, common_1.Post)('message'),
    (0, throttler_decorators_1.MessageThrottle)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Post)('cleanup-duplicates'),
    (0, throttler_decorators_1.StrictThrottle)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "cleanupDuplicateChats", null);
__decorate([
    (0, common_1.Get)('debug/all-chats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "getAllChatsDebug", null);
__decorate([
    (0, common_1.Get)('messages/:chatId'),
    __param(0, (0, common_1.Param)('chatId')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('skip')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Get)('notifications'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "getUserNotifications", null);
__decorate([
    (0, common_1.Get)('notifications/unread'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "getUnreadNotifications", null);
__decorate([
    (0, common_1.Post)('notifications/:id/read'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "markNotificationAsRead", null);
__decorate([
    (0, common_1.Post)('notifications/:id/delivered'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ChatsController.prototype, "markNotificationAsDelivered", null);
exports.ChatsController = ChatsController = __decorate([
    (0, common_1.Controller)('chats'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [chats_service_1.ChatsService])
], ChatsController);
//# sourceMappingURL=chats.controller.js.map