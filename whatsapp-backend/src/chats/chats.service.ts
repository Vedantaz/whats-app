import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Chat } from './schema/chat.schema';
import { Message } from './schema/message.scheam';
import { Notification } from './schema/notification.schema';
import { Model, Types } from 'mongoose';
import { SendMessageDto } from './dto/send-message.dto';
import { JoinRoomDto } from './dto/join-room.dto';
import { UsersService } from '../users/users.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class ChatsService {
  private readonly logger = new Logger(ChatsService.name);

  constructor(
    @InjectModel(Chat.name) private chatModel: Model<Chat>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
    @Inject(forwardRef(() => UsersService))
    private usersService: UsersService,
    private redisService: RedisService,
  ) {}

  async createChat(userId: string, otherUserId: string) {
    const existingChat = await this.chatModel.findOne({
      isGroupChat: false,
      users: { $all: [userId, otherUserId] },
    });
  
    if (existingChat) return existingChat;
  
    const newChat = new this.chatModel({
      users: [userId, otherUserId],
      isGroupChat: false,
    });
    return await newChat.save();
  }

  async getAllChats(userId: string) {
    return this.chatModel
      .find({ users: userId })
      .populate('users', '-password')
      .populate('latestMessage')
      .sort({ updatedAt: -1 });
  }
  



  ////////////////////////// creating new apis from scratch all /////////
  
  async getUserChats(userId: string) {
    try {
      // Check Redis cache first
      const cachedChats = await this.redisService.getUserChats(userId);
      if (cachedChats && cachedChats.length > 0) {
        this.logger.debug(
          `Cache HIT: Found ${cachedChats.length} chats for user ${userId}`,
        );
        return cachedChats;
      }

      this.logger.debug(
        `Cache MISS: Fetching chats from database for user ${userId}`,
      );

      // Convert userId to ObjectId for proper MongoDB query
      const userObjectId = new Types.ObjectId(userId);

      console.log('Fetching chats for user:', userId, '&', 'userObjectId:');

      // Find chats where the user is a participant (unified chat system)
      const chats = await this.chatModel
        .find({ users: userObjectId })
        .populate('users', '-password')
        .sort({ updatedAt: -1 })
        .lean(); // Use lean() for better performance

      // Get ALL messages for each chat (not just last message)
      const chatsWithAllMessages = await Promise.all(
        chats.map(async (chat) => {
          // Get ALL messages for this chat (sorted by creation time)
          const allMessages = await this.messageModel
            .find({ chat: chat._id })
            .populate('sender', '-password')
            .sort({ createdAt: 1 }) // Ascending order (oldest first)
            .lean();

          // Get last message for preview
          const lastMessage =
            allMessages.length > 0 ? allMessages[allMessages.length - 1] : null;

          // Get total message count for this chat
          const messageCount = allMessages.length;

          // Get the other user in the chat (for display purposes)
          const otherUser = chat.users.find(
            (user) => user._id.toString() !== userId,
          );

          console.log(`Chat ${chat._id}: Found ${messageCount} messages`);

          return {
            ...chat,
            messages: allMessages,
            lastMessage: lastMessage || null,
            messageCount,
            otherUser,
            chatPartner: otherUser,
          };
        }),
      );

      // Sort by last message time (most recent first)
      chatsWithAllMessages.sort((a: any, b: any) => {
        const aTime = a.lastMessage
          ? new Date((a.lastMessage as any).createdAt).getTime()
          : 0;
        const bTime = b.lastMessage
          ? new Date((b.lastMessage as any).createdAt).getTime()
          : 0;
        return bTime - aTime;
      });

      // Cache the result for 30 minutes
      await this.redisService.cacheUserChats(
        userId,
        chatsWithAllMessages,
        1800,
      );
      this.logger.debug(
        `Cached ${chatsWithAllMessages.length} chats for user ${userId}`,
      );

      return chatsWithAllMessages;
    } catch (error) {
      console.error('Error fetching user chats:', error);
      throw error;
    }
  }

  async createOrGetChatRoom(senderId: string, receiverId: string) {
    try {
      const senderObjectId = new Types.ObjectId(senderId);
      const receiverObjectId = new Types.ObjectId(receiverId);

      console.log(
        'Creating/finding chat between:',
        senderId,
        'and',
        receiverId,
      );
      console.log('Sender ObjectId:', senderObjectId);
      console.log('Receiver ObjectId:', receiverObjectId);

      // FIXED: Check if chat exists between these users in EITHER direction
      // This ensures only ONE chat exists between any two users
      let existingChat = await this.chatModel
        .findOne({
          $or: [
            { users: { $all: [senderObjectId, receiverObjectId] } }, // A -> B
            { users: { $all: [receiverObjectId, senderObjectId] } }, // B -> A
          ],
        })
        .populate('users', '-password');

      console.log('Query result - existing chat found:', !!existingChat);

      if (existingChat) {
        console.log('✅ FOUND EXISTING CHAT:', existingChat._id);
        console.log(
          'Chat users:',
          existingChat.users.map((u) => `${u._id} (${(u as any).username})`),
        );
        return existingChat;
      }

      // Create new chat with SORTED user IDs to ensure consistency
      // Always put the smaller ObjectId first to maintain order
      const sortedUsers = [senderObjectId, receiverObjectId].sort((a, b) =>
        a.toString().localeCompare(b.toString()),
      );

      const newChat = new this.chatModel({
        users: sortedUsers,
      });
      await newChat.save();

      console.log(
        'Created new chat:',
        newChat._id,
        '&',
        'chat users (sorted):',
        sortedUsers,
      );

      return newChat.populate('users', '-password');
    } catch (error) {
      console.error('Error creating/getting chat room:', error);
      throw error;
    }
  }

  async joinRoom(userId: string, data: JoinRoomDto) {
    const chat = await this.chatModel.findById(data.chatId);
    if (!chat) {
      return { message: 'Chat not found.' };
    }

    const userObjectId = new Types.ObjectId(userId);
    if (chat.users.includes(userObjectId)) {
      return { message: 'User is already in the room.' };
    }

    const userExists = await this.usersService.findById(userId);
    if (!userExists) {
      return { message: 'User does not exist.' };
    }

    chat.users.push(userObjectId);
    await chat.save();
    return { message: `User ${userId} joined room ${data.chatId}`, chat };
  }

  async sendMessage(senderId: string, chatId: string, content: string) {
    const chat = await this.chatModel.findById(chatId);
    if (!chat) throw new NotFoundException('Chat not found');

    // Convert string IDs to ObjectIds
    const chatObjectId = new Types.ObjectId(chatId);
    const senderObjectId = new Types.ObjectId(senderId);

    // Create message using new and save
    const message = new this.messageModel({
      chat: chatObjectId,
      sender: senderObjectId,
      content,
    });

    // Save the message
    await message.save();

    // Update chat's updatedAt timestamp
    await this.chatModel.findByIdAndUpdate(chatId, { updatedAt: new Date() });

    return message.populate('sender', '-password');
  }

  async getMessages(chatId: string, limit: number = 50, skip: number = 0) {
    try {
      console.log(
        `🔍 Fetching messages for chat: ${chatId}, limit: ${limit}, skip: ${skip}`,
      );
      const chatObjectId = new Types.ObjectId(chatId);   // convert string to objectId
       // Optimized database query with indexes
       const startTime = Date.now();
       const messages = await this.messageModel
         .find({ chat: chatObjectId })
         .populate('sender', 'username _id') // Only fetch needed fields
         .sort({ createdAt: 1 }) // Sort by creation time
         .skip(skip)
         .limit(limit)
         .lean() // Use lean for better performance
         .exec();
         
         const queryTime = Date.now() - startTime;
         console.log(
           `📊 Database query took: ${queryTime}ms for ${messages.length} messages`,
          );
          
           return messages;

      // Check Redis cache first (only for recent messages)
      // if (skip === 0) {
      //   const cachedMessages =
      //     await this.redisService.getRecentMessages(chatId);
      //   if (cachedMessages && cachedMessages.length > 0) {
      //     this.logger.debug(
      //       `Cache HIT: Found ${cachedMessages.length} messages for chat ${chatId}`,
      //     );
      //     return cachedMessages.slice(0, limit);
      //   }
      // }

      // this.logger.debug(
      //   `Cache MISS: Fetching messages from database for chat ${chatId}`,
      // );

     
      // Cache the result for 30 minutes (only if it's recent messages)
      // if (skip === 0) {
      //   await this.redisService.cacheRecentMessages(chatId, messages, 1800);
      //   this.logger.debug(
      //     `Cached ${messages.length} messages for chat ${chatId}`,
      //   );
      // }

    } catch (error) {
      this.logger.error(`Error fetching messages for chat ${chatId}:`, error);
      throw error;
    }
  }

  async createMessage(dto: SendMessageDto) {
    try {
      // Convert string IDs to ObjectIds
      const chatObjectId = new Types.ObjectId(dto.chatId);
      const senderObjectId = new Types.ObjectId(dto.senderId);

      // Create message using new and save
      const message = new this.messageModel({
        sender: senderObjectId,
        chat: chatObjectId,
        content: dto.content,
      });

      // Save the message
      await message.save();

      // Update chat's updatedAt timestamp
      await this.chatModel.findByIdAndUpdate(dto.chatId, {
        updatedAt: new Date(),
      });

      // Invalidate related caches
      await this.invalidateMessageCaches(dto.chatId, dto.senderId);

      // Return populated message
      const populatedMessage = await this.messageModel
        .findById(message._id)
        .populate('sender', '-password')
        .populate('chat');

      this.logger.debug(`Created message ${message._id} in chat ${dto.chatId}`);
      return populatedMessage;
    } catch (error) {
      this.logger.error(`Error creating message:`, error);
      throw error;
    }
  }

  async getChatById(chatId: string) {
    try {
      const chat = await this.chatModel
        .findById(chatId)
        .populate('users', '-password');
      return chat;
    } catch (error) {
      console.error('Error getting chat by ID:', error);
      throw error;
    }
  }

  // Notification methods
  async createNotification(
    recipientId: string,
    senderId: string,
    chatId: string,
    messageId: string,
    type: string,
    title: string,
    content: string,
  ) {
    try {
      const notification = new this.notificationModel({
        recipient: new Types.ObjectId(recipientId),
        sender: new Types.ObjectId(senderId),
        chat: new Types.ObjectId(chatId),
        message: new Types.ObjectId(messageId),
        type,
        title,
        content,
        read: false,
        delivered: false,
      });

      await notification.save();
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  async getUserNotifications(userId: string, unreadOnly = false) {
    try {
      const query: any = { recipient: new Types.ObjectId(userId) };
      if (unreadOnly) {
        query.read = false;
      }

      const notifications = await this.notificationModel
        .find(query)
        .populate('sender', '-password')
        .populate('chat')
        .populate('message')
        .sort({ createdAt: -1 })
        .limit(50);

      return notifications;
    } catch (error) {
      console.error('Error getting user notifications:', error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId: string) {
    try {
      await this.notificationModel.findByIdAndUpdate(notificationId, {
        read: true,
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  async markNotificationAsDelivered(notificationId: string) {
    try {
      await this.notificationModel.findByIdAndUpdate(notificationId, {
        delivered: true,
      });
    } catch (error) {
      console.error('Error marking notification as delivered:', error);
      throw error;
    }
  }

  // Cache invalidation methods
  private async invalidateMessageCaches(chatId: string, senderId: string) {
    try {
      // Invalidate chat messages cache
      await this.redisService.invalidateChatMessages(chatId);

      // Invalidate user chats cache for sender
      await this.redisService.invalidateUserChats(senderId);

      // Get chat participants and invalidate their caches too
      const chat = await this.chatModel.findById(chatId).lean();
      if (chat && chat.users) {
        for (const userId of chat.users) {
          const userIdString = userId.toString();
          if (userIdString !== senderId) {
            await this.redisService.invalidateUserChats(userIdString);
          }
        }
      }

      this.logger.debug(
        `Invalidated caches for chat ${chatId} and related users`,
      );
    } catch (error) {
      this.logger.error('Error invalidating caches:', error);
      // Don't throw error here as cache invalidation failure shouldn't break the main flow
    }
  }

  async cleanupDuplicateChats() {
    try {
      console.log('Starting cleanup of duplicate chats...');

      // Get all chats
      const allChats = await this.chatModel.find({}).lean();
      console.log('Total chats found:', allChats.length);

      const duplicateGroups = new Map();
      const chatsToDelete: any[] = [];

      // Group chats by user pairs
      for (const chat of allChats) {
        if (chat.users.length === 2) {
          // Create a sorted key for the user pair
          const sortedUsers = chat.users
            .map((id) => id.toString())
            .sort()
            .join('-');

          if (duplicateGroups.has(sortedUsers)) {
            // This is a duplicate - mark for deletion
            const existingChats = duplicateGroups.get(sortedUsers);

            // Keep the chat with more messages or the newer one
            const existingChat = existingChats[0];
            const existingMessageCount = await this.messageModel.countDocuments(
              { chat: existingChat._id },
            );
            const currentMessageCount = await this.messageModel.countDocuments({
              chat: chat._id,
            });

            if (currentMessageCount > existingMessageCount) {
              // Current chat has more messages, delete the existing one
              chatsToDelete.push(existingChat._id);
              duplicateGroups.set(sortedUsers, [chat]);
            } else {
              // Existing chat has more messages, delete current one
              chatsToDelete.push(chat._id);
            }
          } else {
            duplicateGroups.set(sortedUsers, [chat]);
          }
        }
      }

      console.log('Duplicate chats to delete:', chatsToDelete.length);

      if (chatsToDelete.length > 0) {
        // Delete duplicate chats
        await this.chatModel.deleteMany({ _id: { $in: chatsToDelete } });

        // Delete messages from deleted chats
        await this.messageModel.deleteMany({ chat: { $in: chatsToDelete } });

        console.log('Cleanup completed successfully');
        return {
          message: 'Cleanup completed',
          duplicatesRemoved: chatsToDelete.length,
          remainingChats: allChats.length - chatsToDelete.length,
        };
      } else {
        console.log('No duplicates found');
        return {
          message: 'No duplicate chats found',
          duplicatesRemoved: 0,
          remainingChats: allChats.length,
        };
      }
    } catch (error) {
      console.error('Error during cleanup:', error);
      throw error;
    }
  }

  async getAllChatsDebug() {
    try {
      const allChats = await this.chatModel
        .find({})
        .populate('users', '-password')
        .sort({ updatedAt: -1 });

      const chatsWithDetails = await Promise.all(
        allChats.map(async (chat) => {
          const messageCount = await this.messageModel.countDocuments({
            chat: chat._id,
          });

          const lastMessage = await this.messageModel
            .findOne({ chat: chat._id })
            .populate('sender', '-password')
            .sort({ createdAt: -1 })
            .limit(1);

          return {
            chatId: chat._id,
            users: chat.users.map((u: any) => ({
              id: u._id,
              username: u.username,
              email: u.email,
            })),
            messageCount,
            lastMessage: lastMessage
              ? {
                  content: lastMessage.content,
                  sender: (lastMessage.sender as any).username,
                  createdAt: (lastMessage as any).createdAt,
                }
              : null,
            createdAt: (chat as any).createdAt,
            updatedAt: (chat as any).updatedAt,
          };
        }),
      );

      return {
        totalChats: allChats.length,
        chats: chatsWithDetails,
      };
    } catch (error) {
      console.error('Error getting debug chats:', error);
      throw error;
    }
  }

  async getAllUsers(){
    const allUsers = await this.usersService.getAllUsers();
    return allUsers;
  }
}
