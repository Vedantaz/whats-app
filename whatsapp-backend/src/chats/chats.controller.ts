import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatsService } from './chats.service';
import { AuthenticatedRequest } from 'src/common/request-user.interface';
import { JoinRoomDto } from './dto/join-room.dto';
import {
  StandardThrottle,
  MessageThrottle,
  LenientThrottle,
  StrictThrottle,
} from '../throttler/throttler.decorators';

@Controller('chats')
@UseGuards(AuthGuard('jwt'))
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}


  // Get all chats for the authenticated user
  @Get('my-chats')
  @LenientThrottle() // 20 requests per 60 seconds for reading chats
  getMyChats(@Req() req: AuthenticatedRequest) {
    // get the chats with all other users he did/ for unique user their is only 1 unique chatId
    const userId = req.user._id;
    return this.chatsService.getUserChats(userId);
  }



  // Get all chats for a specific user (keep for backward compatibility)
  @Get('user/:userId')
  @LenientThrottle() // 20 requests per 60 seconds for reading chats
  getUserChats(@Param('userId') userId: string) {
    console.log('Getting chats for user:', userId);
    return this.chatsService.getUserChats(userId);
  }

  // Create or get existing chat with another user (FIXED)
  @Post('create-get-chatroom')
  @StandardThrottle() // 10 requests per 60 seconds for creating chats
  async createChatRoom(
    @Req() req: AuthenticatedRequest,
    @Body() body: { receiverId?: string; senderId?: string },
  ) {
    const currentUserId = req.user._id;

    // Support both old and new request formats
    const receiverId = body.receiverId;
    const senderId = body.senderId || currentUserId;

    console.log('Create chat request body:', body);
    console.log('Current user ID:', currentUserId);
    console.log('Sender ID:', senderId);
    console.log('Receiver ID:', receiverId);

    if (!receiverId) {
      throw new BadRequestException('receiverId is required in request body.');
    }

    if (senderId === receiverId) {
      throw new BadRequestException('Cannot create chat with yourself.');
    }

    const chat = await this.chatsService.createOrGetChatRoom(
      senderId,
      receiverId,
    );
    return chat;
  }

  @Get('messages/:chatId')
  async getMessages(
    @Param('chatId') chatId: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    try {
      console.log('🔍 Getting messages for chat:', chatId);
      const messageLimit = limit ? parseInt(limit) : 50;
      const messageSkip = skip ? parseInt(skip) : 0;

      const startTime = Date.now();
      const messages = await this.chatsService.getMessages(
        chatId,
        messageLimit,
        messageSkip,
      );
      const duration = Date.now() - startTime;

      console.log(`✅ Fetched ${messages.length} messages in ${duration}ms`);
      return messages;
    } catch (error) {
      console.error('❌ Error fetching messages:', error);
      throw error;
    }
  }


  // Get or create chat with a specific user (OPTIMIZED - returns chat + messages)
  @Post('with-user')
  async getChatWithUser(
    @Req() req: AuthenticatedRequest,
    @Body() body: { userId: string },
  ) {
    const currentUserId = req.user._id;

    if (!body.userId) {
      throw new BadRequestException('userId is required in request body.');
    }

    if (currentUserId === body.userId) {
      throw new BadRequestException('Cannot create chat with yourself.');
    }

    console.log(
      'Getting/creating chat between:',
      currentUserId,
      'and',
      body.userId,
    );

    const chat = await this.chatsService.createOrGetChatRoom(
      currentUserId,
      body.userId,
    );

    // Also return messages for this chat
    const messages = await this.chatsService.getMessages(String(chat._id));

    return {
      chat,
      messages,
    };
  }

  @Post('join')
  async joinRoom(@Req() req: AuthenticatedRequest, @Body() body: JoinRoomDto) {
    const userId = req.user._id;

    if (!userId || !body.chatId) {
      throw new BadRequestException('User ID or Chat ID is missing.');
    }
    return await this.chatsService.joinRoom(userId, body);
  }

  @Post('message')
  @MessageThrottle() // 15 requests per 60 seconds for sending messages
  async sendMessage(
    @Body() body: { senderId: string; chatId: string; content: string },
  ) {
    if (!body.senderId || !body.chatId || !body.content) {
      throw new BadRequestException(
        'Sender ID, Chat ID, or Content is missing.',
      );
    }

    const message = await this.chatsService.sendMessage(
      body.senderId,
      body.chatId,
      body.content,
    );

    return message;
  }

  // Cleanup duplicate chats (run this once to fix existing data)
  @Post('cleanup-duplicates')
  @StrictThrottle() // 5 requests per 60 seconds for cleanup operations
  async cleanupDuplicateChats() {
    return this.chatsService.cleanupDuplicateChats();
  }

  // Debug endpoint to see all chats
  @Get('debug/all-chats')
  async getAllChatsDebug() {
    return this.chatsService.getAllChatsDebug();
  }

  // Notification endpoints
  @Get('notifications')
  async getUserNotifications(@Req() req: AuthenticatedRequest) {
    const userId = req.user._id;
    return await this.chatsService.getUserNotifications(userId);
  }

  @Get('notifications/unread')
  async getUnreadNotifications(@Req() req: AuthenticatedRequest) {
    const userId = req.user._id;
    return await this.chatsService.getUserNotifications(userId, true);
  }

  @Post('notifications/:id/read')
  async markNotificationAsRead(@Param('id') notificationId: string) {
    await this.chatsService.markNotificationAsRead(notificationId);
    return { status: 'success', message: 'Notification marked as read' };
  }

  @Post('notifications/:id/delivered')
  async markNotificationAsDelivered(@Param('id') notificationId: string) {
    await this.chatsService.markNotificationAsDelivered(notificationId);
    return { status: 'success', message: 'Notification marked as delivered' };
  }

  @Get('all-users')
  async getAllUsers(){
    const users = this.chatsService.getAllUsers();
    return {message: 'Notification marked as delivered', data:users}
  }
}
