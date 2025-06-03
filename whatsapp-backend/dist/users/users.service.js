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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("./schema/user.schema");
const chats_gateway_1 = require("../chats/chats.gateway");
let UsersService = class UsersService {
    userModel;
    chatGateway;
    constructor(userModel, chatGateway) {
        this.userModel = userModel;
        this.chatGateway = chatGateway;
    }
    async findByMail(email) {
        return this.userModel.findOne({ email }).exec();
    }
    async findById(id) {
        return this.userModel.findById(id).select('-password').exec();
    }
    async searchUsers(query) {
        const regex = new RegExp(query, 'i');
        const users = await this.userModel
            .find({
            $or: [{ username: regex }, { email: regex }],
        })
            .select('-password')
            .exec();
        const onlineUserIds = this.chatGateway.getOnlineUsers();
        return users.map((user) => ({
            ...user.toObject(),
            online: onlineUserIds.includes(user.id.toString()),
        }));
    }
    async findAllUsers() {
        const users = await this.userModel.find().select('-password').exec();
        const onlineUserIds = this.chatGateway.getOnlineUsers();
        return users.map((user) => ({
            ...user.toObject(),
            online: onlineUserIds.includes(user.id.toString()),
        }));
    }
    async getOnlineUsers() {
        const onlineUserIds = this.chatGateway.getOnlineUsers();
        if (onlineUserIds.length === 0)
            return [];
        const onlineUsers = await this.userModel
            .find({ _id: { $in: onlineUserIds } })
            .select('-password')
            .exec();
        return onlineUsers.map((user) => ({
            ...user.toObject(),
            online: true,
        }));
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => chats_gateway_1.ChatGateway))),
    __metadata("design:paramtypes", [mongoose_2.Model,
        chats_gateway_1.ChatGateway])
], UsersService);
//# sourceMappingURL=users.service.js.map