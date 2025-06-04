import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import {
  LenientThrottle,
  StandardThrottle,
} from '../throttler/throttler.decorators';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('search')
  @StandardThrottle() // 10 requests per 60 seconds for user search
  async searchUsers(@Query('query') query: string) {
    return this.usersService.searchUsers(query);
  }

  @Get()
  @LenientThrottle() // 20 requests per 60 seconds for getting all users
  async getAllUsers() {
    return this.usersService.findAllUsers();
  }

  @Get('email')
  @StandardThrottle() // 10 requests per 60 seconds for user lookup
  async getUser(@Query('email') email: string) {
    return this.usersService.findByMail(email);
  }

  @Get('profile')
  @LenientThrottle() // 20 requests per 60 seconds for profile access
  async getProfile(@Req() req: Request) {
    return req.user;
  }

  @Get('online')
  @LenientThrottle() // 20 requests per 60 seconds for online users
  async getOnlineUsers() {
    return this.usersService.getOnlineUsers();
  }
}
