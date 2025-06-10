import { Chat } from './schema/chat.schema';
import { Message } from './schema/message.scheam';
import { Notification } from './schema/notification.schema';
import { Model } from 'mongoose';
import { SendMessageDto } from './dto/send-message.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { UsersService } from '../users/users.service';
import { RedisService } from '../redis/redis.service';
export declare class ChatsService {
    private chatModel;
    private messageModel;
    private notificationModel;
    private usersService;
    private redisService;
    private readonly logger;
    constructor(chatModel: Model<Chat>, messageModel: Model<Message>, notificationModel: Model<Notification>, usersService: UsersService, redisService: RedisService);
    getUserChats(userId: string): Promise<any[]>;
    createOrGetChatRoom(senderId: string, receiverId: string): Promise<Omit<import("mongoose").Document<unknown, {}, Chat, {}> & Chat & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }, never>>;
    joinRoom(userId: string, data: JoinRoomDto): Promise<{
        message: string;
        chat?: undefined;
    } | {
        message: string;
        chat: import("mongoose").Document<unknown, {}, Chat, {}> & Chat & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
    }>;
    sendMessage(senderId: string, chatId: string, content: string): Promise<Omit<import("mongoose").Document<unknown, {}, Message, {}> & Message & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }, never>>;
    getMessages(chatId: string, limit?: number, skip?: number): Promise<any[]>;
    createMessage(dto: SendMessageDto): Promise<(import("mongoose").Document<unknown, {}, Message, {}> & Message & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    getChatById(chatId: string): Promise<(import("mongoose").Document<unknown, {}, Chat, {}> & Chat & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    createNotification(recipientId: string, senderId: string, chatId: string, messageId: string, type: string, title: string, content: string): Promise<import("mongoose").Document<unknown, {}, Notification, {}> & Notification & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    getUserNotifications(userId: string, unreadOnly?: boolean): Promise<(import("mongoose").Document<unknown, {}, Notification, {}> & Notification & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    markNotificationAsRead(notificationId: string): Promise<void>;
    markNotificationAsDelivered(notificationId: string): Promise<void>;
    private invalidateMessageCaches;
    cleanupDuplicateChats(): Promise<{
        message: string;
        duplicatesRemoved: number;
        remainingChats: number;
    }>;
    getAllChatsDebug(): Promise<{
        totalChats: number;
        chats: {
            chatId: unknown;
            users: {
                id: any;
                username: any;
                email: any;
            }[];
            messageCount: number;
            lastMessage: {
                content: string;
                sender: any;
                createdAt: any;
            } | null;
            createdAt: any;
            updatedAt: any;
        }[];
    }>;
    getAllUsers(): Promise<{
        online: boolean;
        username: string;
        email: string;
        password: string;
        profilePic?: string;
        _id: unknown;
        $locals: Record<string, unknown>;
        $op: "save" | "validate" | "remove" | null;
        $where: Record<string, unknown>;
        baseModelName?: string;
        collection: import("mongoose").Collection;
        db: import("mongoose").Connection;
        errors?: import("mongoose").Error.ValidationError;
        id?: any;
        isNew: boolean;
        schema: import("mongoose").Schema;
        __v: number;
    }[]>;
}
