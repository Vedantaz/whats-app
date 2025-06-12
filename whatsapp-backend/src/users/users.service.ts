import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schema/user.schema';
import { ChatGateway } from '../chats/chats.gateway';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
  ) {}

  async findByMail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email });
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).select('-password').exec();
  }

  async searchUsers(query: string) {
    const regex = new RegExp(query, 'i');
    const users = await this.userModel
      .find({
        $or: [{ username: regex }, { email: regex }],
      })
      .select('-password')
      .exec();

    // Add online status to each user
    const onlineUserIds = this.chatGateway.getOnlineUsers();
    return users.map((user) => ({
      ...user.toObject(),
      online: onlineUserIds.includes(user.id.toString()),
    }));
  }

  async findAllUsers() {
    const users = await this.userModel.find().select('-password').exec();

    // Add online status to each user
    const onlineUserIds = this.chatGateway.getOnlineUsers();
    return users.map((user) => ({
      ...user.toObject(),
      online: onlineUserIds.includes(user.id.toString()),
    }));
  }

  async getAllUsers(){
    const users = await this.userModel.find().select('-password').exec();
    console.log(`Fetched ${users.length} users from DB`);
    return users;
  }

  async getOnlineUsers() {
    const onlineUserIds = this.chatGateway.getOnlineUsers();
    if (onlineUserIds.length === 0) return [];

    const onlineUsers = await this.userModel
      .find({ _id: { $in: onlineUserIds } })
      .select('-password')
      .exec();

    return onlineUsers.map((user) => ({
      ...user.toObject(),
      online: true,
    }));
  }

}
