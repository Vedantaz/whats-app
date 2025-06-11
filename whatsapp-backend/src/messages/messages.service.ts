import { Injectable } from '@nestjs/common';

import { Message } from '../chats/schema/message.scheam';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';


@Injectable()
export class MessagesService {

    constructor(@InjectModel(Message.name) private messageModel: Model<Message>){}
    
    async getMessagesByChat(chatId:String, page:number = 1, limit: number=50){
        return this.messageModel.find({chat:chatId}).sort({cretedAt:-1}).skip((page-1)*limit).limit(limit).exec();
    }
}
