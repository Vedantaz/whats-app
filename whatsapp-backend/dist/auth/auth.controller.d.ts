import { AuthService } from './auth.service';
import { registerDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Request } from 'express';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    registerUser(data: registerDto): Promise<{
        message: string;
        user: {
            _id: string;
            username: string;
            email: string;
            profilePic: string | undefined;
        };
    }>;
    loginUser(data: LoginDto): Promise<{
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
    getProfile(req: Request): Express.User | undefined;
}
