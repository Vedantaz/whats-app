import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { registerDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/users/schema/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private userService: UsersService,
    private jwtService: JwtService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async registerUser(data: registerDto) {
    try {
      // Check if user already exists
      const existingUser = await this.userService.findByMail(data.email);
      if (existingUser) {
        throw new BadRequestException('Email already in use.');
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Create user data object
      const userData = {
        username: data.username,
        email: data.email,
        password: hashedPassword,
      };

      // Create and save the user
      const newUser = new this.userModel(userData);
      const savedUser = await newUser.save();

      // Create a safe user object without password
      const userResponse = {
        _id: savedUser['_id'] ? savedUser['_id'].toString() : '',
        username: savedUser.username,
        email: savedUser.email,
        profilePic: savedUser.profilePic,
      };

      return {
        message: 'User Registered successfully.',
        user: userResponse,
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw new BadRequestException(
        'Failed to register user. Please try again.',
      );
    }
  }

  async login(data: LoginDto) {
    try {
      const user = await this.userService.findByMail(data.email);
      if (!user) {
        throw new UnauthorizedException('Invalid credentials.');
      }

      const passwordValidity = await bcrypt.compare(
        data.password,
        user.password,
      );
      if (!passwordValidity) {
        throw new UnauthorizedException('Invalid password.');
      }

      // Get the user ID from the document
      const userId = user['_id'] ? user['_id'].toString() : undefined;

      if (!userId) {
        throw new Error('User ID not found');
      }

      const payload = {
        _id: userId,
        username: user.username,
        email: user.email,
      };

      const token = await this.jwtService.signAsync(payload);

      // Create a safe user object without password
      const userResponse = {
        _id: userId,
        username: user.username,
        email: user.email,
        profilePic: user.profilePic,
      };

      return {
        access_token: token,
        data: userResponse,
        token: token, // Adding token field for backward compatibility
        user: userResponse, // Adding user field for backward compatibility
      };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }
}
