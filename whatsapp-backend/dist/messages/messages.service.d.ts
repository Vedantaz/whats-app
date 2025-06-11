import { Message } from '../chats/schema/message.scheam';
import { Model } from 'mongoose';
export declare class MessagesService {
    private messageModel;
    constructor(messageModel: Model<Message>);
    getMessagesByChat(chatId: String, page?: number, limit?: number): Promise<(import("mongoose").Document<unknown, {}, Message, {}> & Message & Required<{
        _id: unknown;
    }> & {
        __v: number;
    })[]>;
}
