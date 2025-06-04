import { Controller, Body, Post, UseGuards, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { registerDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import {
  AuthThrottle,
  LenientThrottle,
} from '../throttler/throttler.decorators';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register-user')
  @AuthThrottle() // 3 requests per 60 seconds for registration
  async registerUser(@Body() data: registerDto) {
    return await this.authService.registerUser(data);
  }

  @Post('login-user')
  @AuthThrottle() // 3 requests per 60 seconds for login
  async loginUser(@Body() data: LoginDto) {
    return await this.authService.login(data);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  @LenientThrottle() // 20 requests per 60 seconds for profile access
  getProfile(@Req() req: Request) {
    return req.user;
  }
}
