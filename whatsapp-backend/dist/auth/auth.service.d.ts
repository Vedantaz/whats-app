import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { registerDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Model } from 'mongoose';
import { UserDocument } from 'src/users/schema/user.schema';
export declare class AuthService {
    private userService;
    private jwtService;
    private userModel;
    constructor(userService: UsersService, jwtService: JwtService, userModel: Model<UserDocument>);
    registerUser(data: registerDto): Promise<{
        message: string;
        user: {
            _id: string;
            username: string;
            email: string;
            profilePic: string | undefined;
        };
    }>;
    login(data: LoginDto): Promise<{
        access_token: string;
        data: {
            _id: any;
            username: string;
            email: string;
            profilePic: string | undefined;
        };
        token: string;
        user: {
            _id: any;
            username: string;
            email: string;
            profilePic: string | undefined;
        };
    }>;
}
