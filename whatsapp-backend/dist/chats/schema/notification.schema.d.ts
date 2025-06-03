import { Document, Types } from 'mongoose';
export declare class Notification extends Document {
    recipient: Types.ObjectId;
    sender: Types.ObjectId;
    chat: Types.ObjectId;
    message: Types.ObjectId;
    type: string;
    title: string;
    content: string;
    read: boolean;
    delivered: boolean;
}
export declare const NotificationSchema: import("mongoose").Schema<Notification, import("mongoose").Model<Notification, any, any, any, Document<unknown, any, Notification, any> & Notification & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Notification, Document<unknown, {}, import("mongoose").FlatRecord<Notification>, {}> & import("mongoose").FlatRecord<Notification> & Required<{
    _id: unknown;
}> & {
    __v: number;
}>;
