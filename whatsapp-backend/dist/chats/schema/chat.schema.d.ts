import { Document, Types } from 'mongoose';
export declare class Chat extends Document {
    users: Types.ObjectId[];
}
export declare const ChatSchema: import("mongoose").Schema<Chat, import("mongoose").Model<Chat, any, any, any, Document<unknown, any, Chat, any> & Chat & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Chat, Document<unknown, {}, import("mongoose").FlatRecord<Chat>, {}> & import("mongoose").FlatRecord<Chat> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
