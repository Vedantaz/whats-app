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
exports.DatabaseIndexService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const message_scheam_1 = require("../chats/schema/message.scheam");
const chat_schema_1 = require("../chats/schema/chat.schema");
const user_schema_1 = require("../users/schema/user.schema");
let DatabaseIndexService = class DatabaseIndexService {
    messageModel;
    chatModel;
    userModel;
    constructor(messageModel, chatModel, userModel) {
        this.messageModel = messageModel;
        this.chatModel = chatModel;
        this.userModel = userModel;
    }
    async onModuleInit() {
        await this.createIndexes();
    }
    async createIndexes() {
        try {
            console.log('🔧 Creating database indexes for performance optimization...');
            await this.messageModel.collection.createIndex({ chat: 1, createdAt: 1 }, {
                name: 'chat_createdAt_index',
                background: true,
            });
            await this.messageModel.collection.createIndex({ sender: 1, createdAt: -1 }, {
                name: 'sender_createdAt_index',
                background: true,
            });
            await this.messageModel.collection.createIndex({ chat: 1, createdAt: -1 }, {
                name: 'chat_createdAt_desc_index',
                background: true,
            });
            await this.chatModel.collection.createIndex({ users: 1 }, {
                name: 'users_index',
                background: true,
            });
            await this.chatModel.collection.createIndex({ updatedAt: -1 }, {
                name: 'updatedAt_index',
                background: true,
            });
            await this.chatModel.collection.createIndex({ users: 1, updatedAt: -1 }, {
                name: 'users_updatedAt_index',
                background: true,
            });
            await this.userModel.collection.createIndex({ email: 1 }, {
                name: 'email_index',
                unique: true,
                background: true,
            });
            await this.userModel.collection.createIndex({ username: 1 }, {
                name: 'username_index',
                background: true,
            });
            console.log('✅ Database indexes created successfully!');
        }
        catch (error) {
            console.error('❌ Error creating database indexes:', error);
        }
    }
    async getIndexInfo() {
        try {
            const messageIndexes = await this.messageModel.collection.indexes();
            const chatIndexes = await this.chatModel.collection.indexes();
            const userIndexes = await this.userModel.collection.indexes();
            return {
                messages: messageIndexes,
                chats: chatIndexes,
                users: userIndexes,
            };
        }
        catch (error) {
            console.error('Error getting index info:', error);
            throw error;
        }
    }
};
exports.DatabaseIndexService = DatabaseIndexService;
exports.DatabaseIndexService = DatabaseIndexService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(message_scheam_1.Message.name)),
    __param(1, (0, mongoose_1.InjectModel)(chat_schema_1.Chat.name)),
    __param(2, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], DatabaseIndexService);
//# sourceMappingURL=indexes.js.map