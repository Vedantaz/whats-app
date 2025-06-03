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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("../users/users.service");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcryptjs");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("../users/schema/user.schema");
let AuthService = class AuthService {
    userService;
    jwtService;
    userModel;
    constructor(userService, jwtService, userModel) {
        this.userService = userService;
        this.jwtService = jwtService;
        this.userModel = userModel;
    }
    async registerUser(data) {
        try {
            const existingUser = await this.userService.findByMail(data.email);
            if (existingUser) {
                throw new common_1.BadRequestException('Email already in use.');
            }
            const hashedPassword = await bcrypt.hash(data.password, 10);
            const userData = {
                username: data.username,
                email: data.email,
                password: hashedPassword,
            };
            const newUser = new this.userModel(userData);
            const savedUser = await newUser.save();
            const userResponse = {
                _id: savedUser['_id'] ? savedUser['_id'].toString() : '',
                username: savedUser.username,
                email: savedUser.email,
                profilePic: savedUser.profilePic,
            };
            return {
                message: 'User Registered successfully.',
                user: userResponse,
            };
        }
        catch (error) {
            console.error('Registration error:', error);
            throw new common_1.BadRequestException('Failed to register user. Please try again.');
        }
    }
    async login(data) {
        try {
            const user = await this.userService.findByMail(data.email);
            if (!user) {
                throw new common_1.UnauthorizedException('Invalid credentials.');
            }
            const passwordValidity = await bcrypt.compare(data.password, user.password);
            if (!passwordValidity) {
                throw new common_1.UnauthorizedException('Invalid password.');
            }
            const userId = user['_id'] ? user['_id'].toString() : undefined;
            if (!userId) {
                throw new Error('User ID not found');
            }
            const payload = {
                _id: userId,
                username: user.username,
                email: user.email,
            };
            const token = await this.jwtService.signAsync(payload);
            const userResponse = {
                _id: userId,
                username: user.username,
                email: user.email,
                profilePic: user.profilePic,
            };
            return {
                access_token: token,
                data: userResponse,
                token: token,
                user: userResponse,
            };
        }
        catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        mongoose_2.Model])
], AuthService);
//# sourceMappingURL=auth.service.js.map