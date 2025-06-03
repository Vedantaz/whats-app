import { Request } from 'express';
export interface JwtUser {
    _id: string;
    username: string;
    email: string;
}
export interface AuthenticatedRequest extends Request {
    user: JwtUser;
}
