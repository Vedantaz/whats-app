import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message } from '../chats/schema/message.scheam';
import { Chat } from '../chats/schema/chat.schema';
import { User } from '../users/schema/user.schema';

@Injectable()
export class DatabaseIndexService implements OnModuleInit {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<Message>,
    @InjectModel(Chat.name) private chatModel: Model<Chat>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async onModuleInit() {
    await this.createIndexes();
  }

  private async createIndexes() {
    try {
      console.log(
        '🔧 Creating database indexes for performance optimization...',
      );

      // Message indexes for fast queries
      await this.messageModel.collection.createIndex(
        { chat: 1, createdAt: 1 },
        {
          name: 'chat_createdAt_index',
          background: true,
        },
      );

      await this.messageModel.collection.createIndex(
        { sender: 1, createdAt: -1 },
        {
          name: 'sender_createdAt_index',
          background: true,
        },
      );

      await this.messageModel.collection.createIndex(
        { chat: 1, createdAt: -1 },
        {
          name: 'chat_createdAt_desc_index',
          background: true,
        },
      );

      // Chat indexes
      await this.chatModel.collection.createIndex(
        { users: 1 },
        {
          name: 'users_index',
          background: true,
        },
      );

      await this.chatModel.collection.createIndex(
        { updatedAt: -1 },
        {
          name: 'updatedAt_index',
          background: true,
        },
      );

      // Compound index for finding chats between specific users
      await this.chatModel.collection.createIndex(
        { users: 1, updatedAt: -1 },
        {
          name: 'users_updatedAt_index',
          background: true,
        },
      );

      // User indexes
      await this.userModel.collection.createIndex(
        { email: 1 },
        {
          name: 'email_index',
          unique: true,
          background: true,
        },
      );

      await this.userModel.collection.createIndex(
        { username: 1 },
        {
          name: 'username_index',
          background: true,
        },
      );

      console.log('✅ Database indexes created successfully!');
    } catch (error) {
      console.error('❌ Error creating database indexes:', error);
    }
  }

  // Method to check index status
  async getIndexInfo() {
    try {
      const messageIndexes = await this.messageModel.collection.indexes();
      const chatIndexes = await this.chatModel.collection.indexes();
      const userIndexes = await this.userModel.collection.indexes();

      return {
        messages: messageIndexes,
        chats: chatIndexes,
        users: userIndexes,
      };
    } catch (error) {
      console.error('Error getting index info:', error);
      throw error;
    }
  }
}
