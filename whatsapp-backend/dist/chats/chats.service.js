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
var ChatsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const chat_schema_1 = require("./schema/chat.schema");
const message_scheam_1 = require("./schema/message.scheam");
const notification_schema_1 = require("./schema/notification.schema");
const mongoose_2 = require("mongoose");
const users_service_1 = require("../users/users.service");
const redis_service_1 = require("../redis/redis.service");
let ChatsService = ChatsService_1 = class ChatsService {
    chatModel;
    messageModel;
    notificationModel;
    usersService;
    redisService;
    logger = new common_1.Logger(ChatsService_1.name);
    constructor(chatModel, messageModel, notificationModel, usersService, redisService) {
        this.chatModel = chatModel;
        this.messageModel = messageModel;
        this.notificationModel = notificationModel;
        this.usersService = usersService;
        this.redisService = redisService;
    }
    async getUserChats(userId) {
        try {
            const cachedChats = await this.redisService.getUserChats(userId);
            if (cachedChats && cachedChats.length > 0) {
                this.logger.debug(`Cache HIT: Found ${cachedChats.length} chats for user ${userId}`);
                return cachedChats;
            }
            this.logger.debug(`Cache MISS: Fetching chats from database for user ${userId}`);
            const userObjectId = new mongoose_2.Types.ObjectId(userId);
            console.log('Fetching chats for user:', userId, '&', 'userObjectId:');
            const chats = await this.chatModel
                .find({ users: userObjectId })
                .populate('users', '-password')
                .sort({ updatedAt: -1 })
                .lean();
            const chatsWithAllMessages = await Promise.all(chats.map(async (chat) => {
                const allMessages = await this.messageModel
                    .find({ chat: chat._id })
                    .populate('sender', '-password')
                    .sort({ createdAt: 1 })
                    .lean();
                const lastMessage = allMessages.length > 0 ? allMessages[allMessages.length - 1] : null;
                const messageCount = allMessages.length;
                const otherUser = chat.users.find((user) => user._id.toString() !== userId);
                console.log(`Chat ${chat._id}: Found ${messageCount} messages`);
                return {
                    ...chat,
                    messages: allMessages,
                    lastMessage: lastMessage || null,
                    messageCount,
                    otherUser,
                    chatPartner: otherUser,
                };
            }));
            chatsWithAllMessages.sort((a, b) => {
                const aTime = a.lastMessage
                    ? new Date(a.lastMessage.createdAt).getTime()
                    : 0;
                const bTime = b.lastMessage
                    ? new Date(b.lastMessage.createdAt).getTime()
                    : 0;
                return bTime - aTime;
            });
            await this.redisService.cacheUserChats(userId, chatsWithAllMessages, 1800);
            this.logger.debug(`Cached ${chatsWithAllMessages.length} chats for user ${userId}`);
            return chatsWithAllMessages;
        }
        catch (error) {
            console.error('Error fetching user chats:', error);
            throw error;
        }
    }
    async createOrGetChatRoom(senderId, receiverId) {
        try {
            const senderObjectId = new mongoose_2.Types.ObjectId(senderId);
            const receiverObjectId = new mongoose_2.Types.ObjectId(receiverId);
            console.log('Creating/finding chat between:', senderId, 'and', receiverId);
            console.log('Sender ObjectId:', senderObjectId);
            console.log('Receiver ObjectId:', receiverObjectId);
            let existingChat = await this.chatModel
                .findOne({
                $or: [
                    { users: { $all: [senderObjectId, receiverObjectId] } },
                    { users: { $all: [receiverObjectId, senderObjectId] } },
                ],
            })
                .populate('users', '-password');
            console.log('Query result - existing chat found:', !!existingChat);
            if (existingChat) {
                console.log('✅ FOUND EXISTING CHAT:', existingChat._id);
                console.log('Chat users:', existingChat.users.map((u) => `${u._id} (${u.username})`));
                return existingChat;
            }
            const sortedUsers = [senderObjectId, receiverObjectId].sort((a, b) => a.toString().localeCompare(b.toString()));
            const newChat = new this.chatModel({
                users: sortedUsers,
            });
            await newChat.save();
            console.log('Created new chat:', newChat._id, '&', 'chat users (sorted):', sortedUsers);
            return newChat.populate('users', '-password');
        }
        catch (error) {
            console.error('Error creating/getting chat room:', error);
            throw error;
        }
    }
    async joinRoom(userId, data) {
        const chat = await this.chatModel.findById(data.chatId);
        if (!chat) {
            return { message: 'Chat not found.' };
        }
        const userObjectId = new mongoose_2.Types.ObjectId(userId);
        if (chat.users.includes(userObjectId)) {
            return { message: 'User is already in the room.' };
        }
        const userExists = await this.usersService.findById(userId);
        if (!userExists) {
            return { message: 'User does not exist.' };
        }
        chat.users.push(userObjectId);
        await chat.save();
        return { message: `User ${userId} joined room ${data.chatId}`, chat };
    }
    async sendMessage(senderId, chatId, content) {
        const chat = await this.chatModel.findById(chatId);
        if (!chat)
            throw new common_1.NotFoundException('Chat not found');
        const chatObjectId = new mongoose_2.Types.ObjectId(chatId);
        const senderObjectId = new mongoose_2.Types.ObjectId(senderId);
        const message = new this.messageModel({
            chat: chatObjectId,
            sender: senderObjectId,
            content,
        });
        await message.save();
        await this.chatModel.findByIdAndUpdate(chatId, { updatedAt: new Date() });
        return message.populate('sender', '-password');
    }
    async getMessages(chatId, limit = 50, skip = 0) {
        try {
            console.log(`🔍 Fetching messages for chat: ${chatId}, limit: ${limit}, skip: ${skip}`);
            if (skip === 0) {
                const cachedMessages = await this.redisService.getRecentMessages(chatId);
                if (cachedMessages && cachedMessages.length > 0) {
                    this.logger.debug(`Cache HIT: Found ${cachedMessages.length} messages for chat ${chatId}`);
                    return cachedMessages.slice(0, limit);
                }
            }
            this.logger.debug(`Cache MISS: Fetching messages from database for chat ${chatId}`);
            const startTime = Date.now();
            const messages = await this.messageModel
                .find({ chat: chatId })
                .populate('sender', 'username _id')
                .sort({ createdAt: 1 })
                .skip(skip)
                .limit(limit)
                .lean()
                .exec();
            const queryTime = Date.now() - startTime;
            console.log(`📊 Database query took: ${queryTime}ms for ${messages.length} messages`);
            if (skip === 0) {
                await this.redisService.cacheRecentMessages(chatId, messages, 1800);
                this.logger.debug(`Cached ${messages.length} messages for chat ${chatId}`);
            }
            return messages;
        }
        catch (error) {
            this.logger.error(`Error fetching messages for chat ${chatId}:`, error);
            throw error;
        }
    }
    async createMessage(dto) {
        try {
            const chatObjectId = new mongoose_2.Types.ObjectId(dto.chatId);
            const senderObjectId = new mongoose_2.Types.ObjectId(dto.senderId);
            const message = new this.messageModel({
                sender: senderObjectId,
                chat: chatObjectId,
                content: dto.content,
            });
            await message.save();
            await this.chatModel.findByIdAndUpdate(dto.chatId, {
                updatedAt: new Date(),
            });
            await this.invalidateMessageCaches(dto.chatId, dto.senderId);
            const populatedMessage = await this.messageModel
                .findById(message._id)
                .populate('sender', '-password')
                .populate('chat');
            this.logger.debug(`Created message ${message._id} in chat ${dto.chatId}`);
            return populatedMessage;
        }
        catch (error) {
            this.logger.error(`Error creating message:`, error);
            throw error;
        }
    }
    async getChatById(chatId) {
        try {
            const chat = await this.chatModel
                .findById(chatId)
                .populate('users', '-password');
            return chat;
        }
        catch (error) {
            console.error('Error getting chat by ID:', error);
            throw error;
        }
    }
    async createNotification(recipientId, senderId, chatId, messageId, type, title, content) {
        try {
            const notification = new this.notificationModel({
                recipient: new mongoose_2.Types.ObjectId(recipientId),
                sender: new mongoose_2.Types.ObjectId(senderId),
                chat: new mongoose_2.Types.ObjectId(chatId),
                message: new mongoose_2.Types.ObjectId(messageId),
                type,
                title,
                content,
                read: false,
                delivered: false,
            });
            await notification.save();
            return notification;
        }
        catch (error) {
            console.error('Error creating notification:', error);
            throw error;
        }
    }
    async getUserNotifications(userId, unreadOnly = false) {
        try {
            const query = { recipient: new mongoose_2.Types.ObjectId(userId) };
            if (unreadOnly) {
                query.read = false;
            }
            const notifications = await this.notificationModel
                .find(query)
                .populate('sender', '-password')
                .populate('chat')
                .populate('message')
                .sort({ createdAt: -1 })
                .limit(50);
            return notifications;
        }
        catch (error) {
            console.error('Error getting user notifications:', error);
            throw error;
        }
    }
    async markNotificationAsRead(notificationId) {
        try {
            await this.notificationModel.findByIdAndUpdate(notificationId, {
                read: true,
            });
        }
        catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    }
    async markNotificationAsDelivered(notificationId) {
        try {
            await this.notificationModel.findByIdAndUpdate(notificationId, {
                delivered: true,
            });
        }
        catch (error) {
            console.error('Error marking notification as delivered:', error);
            throw error;
        }
    }
    async invalidateMessageCaches(chatId, senderId) {
        try {
            await this.redisService.invalidateChatMessages(chatId);
            await this.redisService.invalidateUserChats(senderId);
            const chat = await this.chatModel.findById(chatId).lean();
            if (chat && chat.users) {
                for (const userId of chat.users) {
                    const userIdString = userId.toString();
                    if (userIdString !== senderId) {
                        await this.redisService.invalidateUserChats(userIdString);
                    }
                }
            }
            this.logger.debug(`Invalidated caches for chat ${chatId} and related users`);
        }
        catch (error) {
            this.logger.error('Error invalidating caches:', error);
        }
    }
    async cleanupDuplicateChats() {
        try {
            console.log('Starting cleanup of duplicate chats...');
            const allChats = await this.chatModel.find({}).lean();
            console.log('Total chats found:', allChats.length);
            const duplicateGroups = new Map();
            const chatsToDelete = [];
            for (const chat of allChats) {
                if (chat.users.length === 2) {
                    const sortedUsers = chat.users
                        .map((id) => id.toString())
                        .sort()
                        .join('-');
                    if (duplicateGroups.has(sortedUsers)) {
                        const existingChats = duplicateGroups.get(sortedUsers);
                        const existingChat = existingChats[0];
                        const existingMessageCount = await this.messageModel.countDocuments({ chat: existingChat._id });
                        const currentMessageCount = await this.messageModel.countDocuments({
                            chat: chat._id,
                        });
                        if (currentMessageCount > existingMessageCount) {
                            chatsToDelete.push(existingChat._id);
                            duplicateGroups.set(sortedUsers, [chat]);
                        }
                        else {
                            chatsToDelete.push(chat._id);
                        }
                    }
                    else {
                        duplicateGroups.set(sortedUsers, [chat]);
                    }
                }
            }
            console.log('Duplicate chats to delete:', chatsToDelete.length);
            if (chatsToDelete.length > 0) {
                await this.chatModel.deleteMany({ _id: { $in: chatsToDelete } });
                await this.messageModel.deleteMany({ chat: { $in: chatsToDelete } });
                console.log('Cleanup completed successfully');
                return {
                    message: 'Cleanup completed',
                    duplicatesRemoved: chatsToDelete.length,
                    remainingChats: allChats.length - chatsToDelete.length,
                };
            }
            else {
                console.log('No duplicates found');
                return {
                    message: 'No duplicate chats found',
                    duplicatesRemoved: 0,
                    remainingChats: allChats.length,
                };
            }
        }
        catch (error) {
            console.error('Error during cleanup:', error);
            throw error;
        }
    }
    async getAllChatsDebug() {
        try {
            const allChats = await this.chatModel
                .find({})
                .populate('users', '-password')
                .sort({ updatedAt: -1 });
            const chatsWithDetails = await Promise.all(allChats.map(async (chat) => {
                const messageCount = await this.messageModel.countDocuments({
                    chat: chat._id,
                });
                const lastMessage = await this.messageModel
                    .findOne({ chat: chat._id })
                    .populate('sender', '-password')
                    .sort({ createdAt: -1 })
                    .limit(1);
                return {
                    chatId: chat._id,
                    users: chat.users.map((u) => ({
                        id: u._id,
                        username: u.username,
                        email: u.email,
                    })),
                    messageCount,
                    lastMessage: lastMessage
                        ? {
                            content: lastMessage.content,
                            sender: lastMessage.sender.username,
                            createdAt: lastMessage.createdAt,
                        }
                        : null,
                    createdAt: chat.createdAt,
                    updatedAt: chat.updatedAt,
                };
            }));
            return {
                totalChats: allChats.length,
                chats: chatsWithDetails,
            };
        }
        catch (error) {
            console.error('Error getting debug chats:', error);
            throw error;
        }
    }
};
exports.ChatsService = ChatsService;
exports.ChatsService = ChatsService = ChatsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(chat_schema_1.Chat.name)),
    __param(1, (0, mongoose_1.InjectModel)(message_scheam_1.Message.name)),
    __param(2, (0, mongoose_1.InjectModel)(notification_schema_1.Notification.name)),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => users_service_1.UsersService))),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        users_service_1.UsersService,
        redis_service_1.RedisService])
], ChatsService);
//# sourceMappingURL=chats.service.js.map