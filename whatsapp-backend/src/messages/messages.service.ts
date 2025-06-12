import { Injectable } from '@nestjs/common';

import { Message } from '../chats/schema/message.scheam';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Chat } from 'src/chats/schema/chat.schema';


@Injectable()
export class MessagesService {

    constructor(
        @InjectModel(Message.name) private messageModel: Model<Message>,
        @InjectModel(Chat.name) private chatModel: Model<Chat>
){}
    
    async sendMessage(chatId: string, senderId: string, content: string) {
        const message = new this.messageModel({
          chat: chatId,
          sender: senderId,
          content,
        });
      
        const savedMessage = await message.save();
      
        await this.chatModel.findByIdAndUpdate(chatId, {
          latestMessage: savedMessage._id,
        });
      
        return savedMessage.populate('sender', 'username _id');
      }

      
    async getMessagesByChat(chatId:String, page:number = 1, limit: number=50){
        return this.messageModel.find({chat:chatId}).populate('sender', 'username').sort({createdAt:-1}).skip((page-1)*limit).limit(limit).exec();
    }
}
