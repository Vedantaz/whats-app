import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatsService } from './chats.service';
import { AuthenticatedRequest } from 'src/common/request-user.interface';
import { JoinRoomDto } from './dto/join-room.dto';

@Controller('chats')
@UseGuards(AuthGuard('jwt'))
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  // Get all chats for the authenticated user
  @Get('my-chats')
  getMyChats(@Req() req: AuthenticatedRequest) {
    // get the chats with all other users he did/ for unique user their is only 1 unique chatId
    const userId = req.user._id;
    return this.chatsService.getUserChats(userId);
  }

  // Get all chats for a specific user (keep for backward compatibility)
  @Get('user/:userId')
  getUserChats(@Param('userId') userId: string) {
    console.log('Getting chats for user:', userId);
    return this.chatsService.getUserChats(userId);
  }

  // Create or get existing chat with another user (FIXED)
  @Post('create')
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
  async cleanupDuplicateChats() {
    return this.chatsService.cleanupDuplicateChats();
  }

  // Debug endpoint to see all chats
  @Get('debug/all-chats')
  async getAllChatsDebug() {
    return this.chatsService.getAllChatsDebug();
  }

  @Get('messages/:chatId')
  getMessages(@Param('chatId') chatId: string) {
    return this.chatsService.getMessages(chatId);
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
}
