import {
  SubscribeMessage,
  WebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { SendMessageDto } from './dto/send-message.dto';
import { UsersService } from '../users/users.service';
import { RedisService } from '../redis/redis.service';

interface UserSocket {
  userId: string;
  socketId: string;
  username?: string;
  email?: string;
}

@WebSocketGateway({ cors: true })
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('ChatGateway');
  private connectedUsers: Map<string, UserSocket> = new Map(); // userId -> UserSocket

  constructor(
    private readonly chatService: ChatsService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly redisService: RedisService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Find and remove the disconnected user
    for (const [userId, userSocket] of this.connectedUsers.entries()) {
      if (userSocket.socketId === client.id) {
        console.log(
          `🔴 User ${userSocket.username || userId} (${userId}) going offline (socket ${client.id} disconnected)`,
        );

        this.connectedUsers.delete(userId);

        // Get updated online users list with usernames
        const onlineUsers = Array.from(this.connectedUsers.values()).map(
          (user) => ({
            userId: user.userId,
            username: user.username,
            email: user.email,
          }),
        );

        console.log(
          '📊 Updated online users after disconnect:',
          onlineUsers.map((u) => `${u.username} (${u.userId})`),
        );

        // Remove from Redis
        await this.redisService.setUserOffline(userId);

        // Notify all clients about the user's offline status
        this.server.emit('userStatusChange', {
          userId,
          username: userSocket.username,
          status: 'offline',
        });

        // Broadcast updated online users list to all clients
        this.server.emit('onlineUsersUpdate', { onlineUsers });

        this.logger.log(
          `User ${userSocket.username || userId} is now offline. Total online users: ${onlineUsers.length}`,
        );
        break;
      }
    }
  }

  @SubscribeMessage('setUserOnline')
  async handleSetUserOnline(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { userId } = data;

    try {
      // Fetch user details from database
      const user = await this.usersService.findById(userId);

      if (!user) {
        console.log(`❌ User ${userId} not found in database`);
        return { status: 'error', message: 'User not found' };
      }

      console.log(
        `🟢 Setting user ${user.username} (${userId}) online with socket ${client.id}`,
      );

      // Store the user's connection with full details
      const userSocketData = {
        userId,
        socketId: client.id,
        username: user.username,
        email: user.email,
      };

      this.connectedUsers.set(userId, userSocketData);

      // Store in Redis for persistence and scalability
      await this.redisService.setUserOnline(userId, client.id, {
        username: user.username,
        email: user.email,
      });

      // Get current online users list with usernames
      const onlineUsers = Array.from(this.connectedUsers.values()).map(
        (user) => ({
          userId: user.userId,
          username: user.username,
          email: user.email,
        }),
      );

      console.log(
        '📊 Current online users:',
        onlineUsers.map((u) => `${u.username} (${u.userId})`),
      );

      // Notify all clients about the user's online status
      this.server.emit('userStatusChange', {
        userId,
        username: user.username,
        status: 'online',
      });

      // Send current online users list to the connecting user
      client.emit('onlineUsersList', { onlineUsers });

      // Broadcast updated online users list to all clients
      this.server.emit('onlineUsersUpdate', { onlineUsers });

      this.logger.log(
        `User ${user.username} (${userId}) is now online with socket ${client.id}`,
      );
      this.logger.log(`Total online users: ${onlineUsers.length}`);

      return { status: 'success', onlineUsers };
    } catch (error) {
      console.error(`❌ Error setting user ${userId} online:`, error);
      return { status: 'error', message: 'Failed to set user online' };
    }
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(
    @MessageBody() roomId: string,
    @ConnectedSocket() client: Socket,
  ) {
    client.join(roomId);
    this.logger.log(`Client ${client.id} joined room ${roomId}`);
    return { status: 'success' };
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      // Save message to database
      const message = await this.chatService.createMessage(data);

      // Get chat details to find all participants
      const chat = await this.chatService.getChatById(data.chatId);

      if (!chat) {
        throw new Error('Chat not found');
      }

      // Get sender information
      const sender = await this.usersService.findById(data.senderId);

      if (!sender) {
        throw new Error('Sender not found');
      }

      // Enhanced notification data
      const notificationData = {
        ...message,
        chatId: data.chatId,
        senderInfo: {
          _id: (sender as any)._id,
          username: sender.username,
          email: sender.email,
        },
        timestamp: new Date(),
        type: 'message',
      };

      // Emit to room (all users currently in the chat room)
      this.server.to(data.chatId).emit('newMessage', notificationData);

      // Send notifications to all chat participants (even if not in room)
      await this.broadcastNotificationToAllChatMembers(
        chat,
        notificationData,
        data.senderId,
      );

      // Optional: Broadcast to all connected users for global notifications
      // Uncomment the line below if you want global message notifications
      // this.server.emit('globalNotification', notificationData);

      this.logger.log(
        `Message sent in chat ${data.chatId} by ${sender.username}`,
      );

      return { status: 'success', message: notificationData };
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      return { status: 'error', message: error.message };
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { chatId: string; userId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    // Broadcast typing status to everyone in the room except sender
    client.to(data.chatId).emit('userTyping', {
      chatId: data.chatId,
      userId: data.userId,
      isTyping: data.isTyping,
    });

    return { status: 'success' };
  }

  @SubscribeMessage('getOnlineUsers')
  handleGetOnlineUsers(@ConnectedSocket() client: Socket) {
    const onlineUsers = Array.from(this.connectedUsers.values()).map(
      (user) => ({
        userId: user.userId,
        username: user.username,
        email: user.email,
      }),
    );
    client.emit('onlineUsersList', { onlineUsers });
    return { status: 'success', onlineUsers };
  }

  // Enhanced notification method to broadcast to all chat members
  private async broadcastNotificationToAllChatMembers(
    chat: any,
    notificationData: any,
    senderId: string,
  ) {
    try {
      if (!chat || !chat.users) {
        this.logger.warn(
          'Chat or chat users not found for notification broadcast',
        );
        return;
      }

      // Get all users in the chat
      const chatUsers = chat.users;

      for (const user of chatUsers) {
        const userId = user._id?.toString() || user.toString();

        // Skip sending notification to the sender
        if (userId === senderId) {
          continue;
        }

        // Check if user is online
        const userSocket = this.connectedUsers.get(userId);

        if (userSocket) {
          // User is online, send direct notification
          this.server.to(userSocket.socketId).emit('messageNotification', {
            ...notificationData,
            isDirectNotification: true,
            recipientId: userId,
          });

          this.logger.log(
            `Notification sent to online user ${userSocket.username || userId}`,
          );
        } else {
          // User is offline, store notification in database
          this.logger.log(
            `User ${userId} is offline, storing notification in database`,
          );

          try {
            await this.chatService.createNotification(
              userId,
              senderId,
              notificationData.chatId,
              notificationData._id,
              'message',
              `New message from ${notificationData.senderInfo.username}`,
              notificationData.content,
            );
            this.logger.log(`Notification stored for offline user ${userId}`);
          } catch (error) {
            this.logger.error(
              `Failed to store notification for user ${userId}: ${error.message}`,
            );
          }
        }
      }

      // Broadcast to all connected users for global awareness (optional)
      this.server.emit('chatActivity', {
        chatId: chat._id,
        type: 'new_message',
        senderInfo: notificationData.senderInfo,
        timestamp: notificationData.timestamp,
      });
    } catch (error) {
      this.logger.error(
        `Error broadcasting notification to chat members: ${error.message}`,
      );
    }
  }

  // Method to broadcast notifications to ALL connected users
  @SubscribeMessage('broadcastToAll')
  async handleBroadcastToAll(
    @MessageBody() data: { message: string; type: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const broadcastData = {
        ...data,
        timestamp: new Date(),
        broadcastId: Date.now().toString(),
      };

      // Broadcast to all connected users
      this.server.emit('globalBroadcast', broadcastData);

      this.logger.log(`Global broadcast sent: ${data.message}`);
      return { status: 'success', broadcastData };
    } catch (error) {
      this.logger.error(`Error in global broadcast: ${error.message}`);
      return { status: 'error', message: error.message };
    }
  }

  getOnlineUsers(): Array<{
    userId: string;
    username?: string;
    email?: string;
  }> {
    return Array.from(this.connectedUsers.values()).map((user) => ({
      userId: user.userId,
      username: user.username,
      email: user.email,
    }));
  }

  // Method to check if a specific user is online
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  // Method to get online status for multiple users with usernames
  getUsersOnlineStatus(userIds: string[]): {
    [userId: string]: { online: boolean; username?: string };
  } {
    const status: { [userId: string]: { online: boolean; username?: string } } =
      {};
    userIds.forEach((userId) => {
      const userSocket = this.connectedUsers.get(userId);
      status[userId] = {
        online: !!userSocket,
        username: userSocket?.username,
      };
    });
    return status;
  }
}
