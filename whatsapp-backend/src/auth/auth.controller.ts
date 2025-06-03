import { Controller, Body, Post, UseGuards, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { registerDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register-user')
  async registerUser(@Body() data: registerDto) {
    return await this.authService.registerUser(data);
  }

  @Post('login-user')
  async loginUser(@Body() data: LoginDto) {
    return await this.authService.login(data);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Req() req: Request) {
    return req.user;
  }
}
