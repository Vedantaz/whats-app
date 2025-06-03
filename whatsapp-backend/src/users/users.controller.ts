import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('search')
  async searchUsers(@Query('query') query: string) {
    return this.usersService.searchUsers(query);
  }

  @Get()
  async getAllUsers() {
    return this.usersService.findAllUsers();
  }

  @Get('email')
  async getUser(@Query('email') email: string) {
    return this.usersService.findByMail(email);
  }

  @Get('profile')
  async getProfile(@Req() req: Request) {
    return req.user;
  }

  @Get('online')
  async getOnlineUsers() {
    return this.usersService.getOnlineUsers();
  }
}
