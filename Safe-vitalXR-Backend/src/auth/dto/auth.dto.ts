import { IsEmail, IsString, MinLength, IsMongoId, IsPhoneNumber, IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@safevitals.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'MyPassword123!' })
  @IsString()
  @MinLength(6)
  password: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsMongoId()
  userId: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  otp: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@safevitals.com' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'reset-token-here' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'NewPassword123!', description: 'Min 8 chars, must include uppercase, number, and special character' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).*$/, {
    message: 'Password must contain at least one uppercase letter, one number, and one special character',
  })
  password: string;
}

export class SetupPasswordDto {
  @ApiProperty({ example: 'invitation-token-here' })
  @IsString()
  invitationToken: string;

  @ApiProperty({ example: 'NewPassword123!', description: 'Min 8 chars, must include uppercase, number, and special character' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).*$/, {
    message: 'Password must contain at least one uppercase letter, one number, and one special character',
  })
  password: string;
}

export class ResendOtpDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsMongoId()
  userId: string;
}

export class FirebaseLoginDto {
  @ApiProperty({ description: 'Firebase ID token obtained from client-side Firebase Auth SDK' })
  @IsString()
  idToken: string;
}

export class FirebaseRegisterDto {
  @ApiProperty({ description: 'Firebase ID token obtained from client-side Firebase Auth SDK' })
  @IsString()
  idToken: string;

  @ApiProperty({ example: 'Ravi Kumar', description: 'Full name of the user' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: '+919876543210', description: 'Phone number with country code', required: false })
  @IsString()
  @IsOptional()
  phone?: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'Ravi Kumar', description: 'Full name of the user' })
  @IsString()
  fullName: string;

  @ApiProperty({ example: 'ravi@gmail.com', description: 'Email address (used for OTP verification)' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '+919876543210', description: 'Phone number with country code' })
  @IsString()
  phone: string;
}

export class VerifyRegistrationOtpDto {
  @ApiProperty({ description: 'Registration token returned from POST /auth/register' })
  @IsString()
  registrationToken: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP sent to email' })
  @IsString()
  otp: string;

  @ApiProperty({ example: 'NewPassword123!', description: 'Min 8 chars, must include uppercase, number, and special character' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).*$/, {
    message: 'Password must contain at least one uppercase letter, one number, and one special character',
  })
  password: string;
}
