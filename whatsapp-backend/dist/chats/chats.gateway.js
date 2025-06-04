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
exports.ChatGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const chats_service_1 = require("./chats.service");
const send_message_dto_1 = require("./dto/send-message.dto");
const users_service_1 = require("../users/users.service");
const redis_service_1 = require("../redis/redis.service");
let ChatGateway = class ChatGateway {
    chatService;
    usersService;
    redisService;
    server;
    logger = new common_1.Logger('ChatGateway');
    connectedUsers = new Map();
    constructor(chatService, usersService, redisService) {
        this.chatService = chatService;
        this.usersService = usersService;
        this.redisService = redisService;
    }
    afterInit(server) {
        this.logger.log('WebSocket Initialized');
    }
    handleConnection(client) {
        this.logger.log(`Client connected: ${client.id}`);
    }
    async handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
        for (const [userId, userSocket] of this.connectedUsers.entries()) {
            if (userSocket.socketId === client.id) {
                console.log(`🔴 User ${userSocket.username || userId} (${userId}) going offline (socket ${client.id} disconnected)`);
                this.connectedUsers.delete(userId);
                const onlineUsers = Array.from(this.connectedUsers.values()).map((user) => ({
                    userId: user.userId,
                    username: user.username,
                    email: user.email,
                }));
                console.log('📊 Updated online users after disconnect:', onlineUsers.map((u) => `${u.username} (${u.userId})`));
                await this.redisService.setUserOffline(userId);
                this.server.emit('userStatusChange', {
                    userId,
                    username: userSocket.username,
                    status: 'offline',
                });
                this.server.emit('onlineUsersUpdate', { onlineUsers });
                this.logger.log(`User ${userSocket.username || userId} is now offline. Total online users: ${onlineUsers.length}`);
                break;
            }
        }
    }
    async handleSetUserOnline(data, client) {
        const { userId } = data;
        try {
            const user = await this.usersService.findById(userId);
            if (!user) {
                console.log(`❌ User ${userId} not found in database`);
                return { status: 'error', message: 'User not found' };
            }
            console.log(`🟢 Setting user ${user.username} (${userId}) online with socket ${client.id}`);
            const userSocketData = {
                userId,
                socketId: client.id,
                username: user.username,
                email: user.email,
            };
            this.connectedUsers.set(userId, userSocketData);
            await this.redisService.setUserOnline(userId, client.id, {
                username: user.username,
                email: user.email,
            });
            const onlineUsers = Array.from(this.connectedUsers.values()).map((user) => ({
                userId: user.userId,
                username: user.username,
                email: user.email,
            }));
            console.log('📊 Current online users:', onlineUsers.map((u) => `${u.username} (${u.userId})`));
            this.server.emit('userStatusChange', {
                userId,
                username: user.username,
                status: 'online',
            });
            client.emit('onlineUsersList', { onlineUsers });
            this.server.emit('onlineUsersUpdate', { onlineUsers });
            this.logger.log(`User ${user.username} (${userId}) is now online with socket ${client.id}`);
            this.logger.log(`Total online users: ${onlineUsers.length}`);
            return { status: 'success', onlineUsers };
        }
        catch (error) {
            console.error(`❌ Error setting user ${userId} online:`, error);
            return { status: 'error', message: 'Failed to set user online' };
        }
    }
    handleJoinRoom(roomId, client) {
        client.join(roomId);
        this.logger.log(`Client ${client.id} joined room ${roomId}`);
        return { status: 'success' };
    }
    async handleSendMessage(data, client) {
        try {
            const message = await this.chatService.createMessage(data);
            const chat = await this.chatService.getChatById(data.chatId);
            if (!chat) {
                throw new Error('Chat not found');
            }
            const sender = await this.usersService.findById(data.senderId);
            if (!sender) {
                throw new Error('Sender not found');
            }
            const notificationData = {
                ...message,
                chatId: data.chatId,
                senderInfo: {
                    _id: sender._id,
                    username: sender.username,
                    email: sender.email,
                },
                timestamp: new Date(),
                type: 'message',
            };
            this.server.to(data.chatId).emit('newMessage', notificationData);
            await this.broadcastNotificationToAllChatMembers(chat, notificationData, data.senderId);
            this.logger.log(`Message sent in chat ${data.chatId} by ${sender.username}`);
            return { status: 'success', message: notificationData };
        }
        catch (error) {
            this.logger.error(`Error sending message: ${error.message}`);
            return { status: 'error', message: error.message };
        }
    }
    handleTyping(data, client) {
        client.to(data.chatId).emit('userTyping', {
            chatId: data.chatId,
            userId: data.userId,
            isTyping: data.isTyping,
        });
        return { status: 'success' };
    }
    handleGetOnlineUsers(client) {
        const onlineUsers = Array.from(this.connectedUsers.values()).map((user) => ({
            userId: user.userId,
            username: user.username,
            email: user.email,
        }));
        client.emit('onlineUsersList', { onlineUsers });
        return { status: 'success', onlineUsers };
    }
    async broadcastNotificationToAllChatMembers(chat, notificationData, senderId) {
        try {
            if (!chat || !chat.users) {
                this.logger.warn('Chat or chat users not found for notification broadcast');
                return;
            }
            const chatUsers = chat.users;
            for (const user of chatUsers) {
                const userId = user._id?.toString() || user.toString();
                if (userId === senderId) {
                    continue;
                }
                const userSocket = this.connectedUsers.get(userId);
                if (userSocket) {
                    this.server.to(userSocket.socketId).emit('messageNotification', {
                        ...notificationData,
                        isDirectNotification: true,
                        recipientId: userId,
                    });
                    this.logger.log(`Notification sent to online user ${userSocket.username || userId}`);
                }
                else {
                    this.logger.log(`User ${userId} is offline, storing notification in database`);
                    try {
                        await this.chatService.createNotification(userId, senderId, notificationData.chatId, notificationData._id, 'message', `New message from ${notificationData.senderInfo.username}`, notificationData.content);
                        this.logger.log(`Notification stored for offline user ${userId}`);
                    }
                    catch (error) {
                        this.logger.error(`Failed to store notification for user ${userId}: ${error.message}`);
                    }
                }
            }
            this.server.emit('chatActivity', {
                chatId: chat._id,
                type: 'new_message',
                senderInfo: notificationData.senderInfo,
                timestamp: notificationData.timestamp,
            });
        }
        catch (error) {
            this.logger.error(`Error broadcasting notification to chat members: ${error.message}`);
        }
    }
    async handleBroadcastToAll(data, client) {
        try {
            const broadcastData = {
                ...data,
                timestamp: new Date(),
                broadcastId: Date.now().toString(),
            };
            this.server.emit('globalBroadcast', broadcastData);
            this.logger.log(`Global broadcast sent: ${data.message}`);
            return { status: 'success', broadcastData };
        }
        catch (error) {
            this.logger.error(`Error in global broadcast: ${error.message}`);
            return { status: 'error', message: error.message };
        }
    }
    getOnlineUsers() {
        return Array.from(this.connectedUsers.values()).map((user) => ({
            userId: user.userId,
            username: user.username,
            email: user.email,
        }));
    }
    isUserOnline(userId) {
        return this.connectedUsers.has(userId);
    }
    getUsersOnlineStatus(userIds) {
        const status = {};
        userIds.forEach((userId) => {
            const userSocket = this.connectedUsers.get(userId);
            status[userId] = {
                online: !!userSocket,
                username: userSocket?.username,
            };
        });
        return status;
    }
};
exports.ChatGateway = ChatGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], ChatGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('setUserOnline'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleSetUserOnline", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('joinRoom'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleJoinRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('sendMessage'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_message_dto_1.SendMessageDto,
        socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleSendMessage", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('typing'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleTyping", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('getOnlineUsers'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], ChatGateway.prototype, "handleGetOnlineUsers", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('broadcastToAll'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], ChatGateway.prototype, "handleBroadcastToAll", null);
exports.ChatGateway = ChatGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({ cors: true }),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => users_service_1.UsersService))),
    __metadata("design:paramtypes", [chats_service_1.ChatsService,
        users_service_1.UsersService,
        redis_service_1.RedisService])
], ChatGateway);
//# sourceMappingURL=chats.gateway.js.map