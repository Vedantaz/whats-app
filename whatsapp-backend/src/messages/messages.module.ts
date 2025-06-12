import { Module } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesController } from './messages.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {Message , MessageSchema } from 'src/chats/schema/message.scheam';
import { Chat, ChatSchema } from 'src/chats/schema/chat.schema';

@Module({
  imports:[
    MongooseModule.forFeature([
      { name: Message.name, schema: MessageSchema },
      { name: Chat.name, schema: ChatSchema },
  ])
  ],
  providers: [MessagesService],
  controllers: [MessagesController]
})
export class MessagesModule {}
