import { Controller, Post, Body, Req, Res, HttpCode, HttpStatus, UseGuards, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, VerifyOtpDto, ForgotPasswordDto, ResetPasswordDto, SetupPasswordDto, ResendOtpDto, FirebaseLoginDto, RegisterDto, VerifyRegistrationOtpDto, UpdatePasswordDto } from './dto/auth.dto';
import type { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('firebase-login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login or authenticate with Firebase ID Token' })
  firebaseLogin(@Body() dto: FirebaseLoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.firebaseLogin(dto.idToken, req.ip, req.headers['user-agent']).then(result => {
      if (result.token) this.setTokenCookie(res, result.token);
      return result;
    });
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Self-register: submit details and receive email OTP for verification' })
  register(@Body() dto: RegisterDto, @Req() req: Request) {
    return this.authService.register(dto.fullName, dto.email, dto.phone, req.ip, req.headers['user-agent']);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('register/verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Self-register: verify email OTP and complete account creation' })
  verifyRegistrationOtp(@Body() dto: VerifyRegistrationOtpDto, @Req() req: Request) {
    return this.authService.verifyRegistrationOtp(dto.registrationToken, dto.otp, dto.password, req.ip, req.headers['user-agent']);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email/password. Dispatches 2FA OTP challenge.' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto.email, dto.password, req.ip, req.headers['user-agent']);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP challenge and receive JWT token.' })
  verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.verifyOtp(
      dto.userId,
      dto.otp,
      req.ip,
      req.headers['user-agent'],
    ).then(result => {
      if (result.token) this.setTokenCookie(res, result.token);
      return result;
    });
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a new OTP challenge' })
  resendOtp(@Body() dto: ResendOtpDto, @Req() req: Request) {
    return this.authService.resendOtp(dto.userId, req.ip, req.headers['user-agent']);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset token dispatch' })
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    return this.authService.forgotPassword(dto.email, req.ip, req.headers['user-agent']);
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password using reset token' })
  resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    return this.authService.resetPassword(dto.token, dto.password, req.ip, req.headers['user-agent']);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('setup-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate account via invitation token and set permanent password.' })
  setupPassword(@Body() dto: SetupPasswordDto, @Req() req: Request) {
    return this.authService.setupPassword(dto.invitationToken, dto.password, req.ip, req.headers['user-agent']);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke active sessions and logout' })
  logout(@CurrentUser('_id') userId: string, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token');
    return this.authService.logout(userId.toString(), req.ip, req.headers['user-agent']);
  }

  private setTokenCookie(res: Response, token: string) {
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user identity and permissions' })
  me(@CurrentUser() user: any) {
    return { success: true, user };
  }

  // ─────────────────────────────────────────
  // GITHUB OAUTH
  // ─────────────────────────────────────────
  @Public()
  @Get('github')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'Initiate GitHub OAuth login' })
  githubLogin() {
    // Handled by Passport GitHub strategy
  }

  @Public()
  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'GitHub OAuth callback' })
  githubCallback(@Req() req: any, @Res() res: Response) {
    const token = req.user?.token;
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');

    if (token) {
      return res.redirect(`${frontendUrl}/auth/callback?token=${encodeURIComponent(token)}`);
    }

    return res.redirect(`${frontendUrl}/login?error=Unauthorized`);
  }
}

