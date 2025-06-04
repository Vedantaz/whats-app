import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { ChatsService } from './chats.service';
import { SendMessageDto } from './dto/send-message.dto';
import { UsersService } from '../users/users.service';
import { RedisService } from '../redis/redis.service';
export declare class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly chatService;
    private readonly usersService;
    private readonly redisService;
    server: Server;
    private logger;
    private connectedUsers;
    constructor(chatService: ChatsService, usersService: UsersService, redisService: RedisService);
    afterInit(server: Server): void;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): Promise<void>;
    handleSetUserOnline(data: {
        userId: string;
    }, client: Socket): Promise<{
        status: string;
        message: string;
        onlineUsers?: undefined;
    } | {
        status: string;
        onlineUsers: {
            userId: string;
            username: string | undefined;
            email: string | undefined;
        }[];
        message?: undefined;
    }>;
    handleJoinRoom(roomId: string, client: Socket): {
        status: string;
    };
    handleSendMessage(data: SendMessageDto, client: Socket): Promise<{
        status: string;
        message: any;
    }>;
    handleTyping(data: {
        chatId: string;
        userId: string;
        isTyping: boolean;
    }, client: Socket): {
        status: string;
    };
    handleGetOnlineUsers(client: Socket): {
        status: string;
        onlineUsers: {
            userId: string;
            username: string | undefined;
            email: string | undefined;
        }[];
    };
    private broadcastNotificationToAllChatMembers;
    handleBroadcastToAll(data: {
        message: string;
        type: string;
    }, client: Socket): Promise<{
        status: string;
        broadcastData: {
            timestamp: Date;
            broadcastId: string;
            message: string;
            type: string;
        };
        message?: undefined;
    } | {
        status: string;
        message: any;
        broadcastData?: undefined;
    }>;
    getOnlineUsers(): Array<{
        userId: string;
        username?: string;
        email?: string;
    }>;
    isUserOnline(userId: string): boolean;
    getUsersOnlineStatus(userIds: string[]): {
        [userId: string]: {
            online: boolean;
            username?: string;
        };
    };
}
