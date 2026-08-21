import { IsEmail, IsString, MinLength, IsMongoId } from 'class-validator';
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

  @ApiProperty({ example: 'NewPassword123!' })
  @IsString()
  @MinLength(8)
  password: string;
}

export class SetupPasswordDto {
  @ApiProperty({ example: 'invitation-token-here' })
  @IsString()
  invitationToken: string;

  @ApiProperty({ example: 'NewPassword123!' })
  @IsString()
  @MinLength(8)
  password: string;
}

export class ResendOtpDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  @IsMongoId()
  userId: string;
}
