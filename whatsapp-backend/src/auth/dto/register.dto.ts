import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
export class registerDto {
  @IsNotEmpty()
  username: string;

  @MinLength(6)
  password: string;

  @IsEmail()
  email: string;
}
