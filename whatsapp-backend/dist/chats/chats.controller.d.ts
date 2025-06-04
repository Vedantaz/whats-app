import { ChatsService } from './chats.service';
import { AuthenticatedRequest } from 'src/common/request-user.interface';
import { JoinRoomDto } from './dto/join-room.dto';
export declare class ChatsController {
    private readonly chatsService;
    constructor(chatsService: ChatsService);
    getMyChats(req: AuthenticatedRequest): Promise<any[]>;
    getUserChats(userId: string): Promise<any[]>;
    createChatRoom(req: AuthenticatedRequest, body: {
        receiverId?: string;
        senderId?: string;
    }): Promise<Omit<import("mongoose").Document<unknown, {}, import("./schema/chat.schema").Chat, {}> & import("./schema/chat.schema").Chat & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }, never>>;
    getChatWithUser(req: AuthenticatedRequest, body: {
        userId: string;
    }): Promise<{
        chat: Omit<import("mongoose").Document<unknown, {}, import("./schema/chat.schema").Chat, {}> & import("./schema/chat.schema").Chat & Required<{
            _id: unknown;
        }> & {
            __v: number;
        }, never>;
        messages: any[];
    }>;
    joinRoom(req: AuthenticatedRequest, body: JoinRoomDto): Promise<{
        message: string;
        chat?: undefined;
    } | {
        message: string;
        chat: import("mongoose").Document<unknown, {}, import("./schema/chat.schema").Chat, {}> & import("./schema/chat.schema").Chat & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
    }>;
    sendMessage(body: {
        senderId: string;
        chatId: string;
        content: string;
    }): Promise<Omit<import("mongoose").Document<unknown, {}, import("./schema/message.scheam").Message, {}> & import("./schema/message.scheam").Message & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }, never>>;
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
    getMessages(chatId: string, limit?: string, skip?: string): Promise<any[]>;
    getUserNotifications(req: AuthenticatedRequest): Promise<(import("mongoose").Document<unknown, {}, import("./schema/notification.schema").Notification, {}> & import("./schema/notification.schema").Notification & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    getUnreadNotifications(req: AuthenticatedRequest): Promise<(import("mongoose").Document<unknown, {}, import("./schema/notification.schema").Notification, {}> & import("./schema/notification.schema").Notification & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
    markNotificationAsRead(notificationId: string): Promise<{
        status: string;
        message: string;
    }>;
    markNotificationAsDelivered(notificationId: string): Promise<{
        status: string;
        message: string;
    }>;
}
