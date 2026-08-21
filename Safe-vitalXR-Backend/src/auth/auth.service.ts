import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { Session, SessionDocument } from './schemas/session.schema';
import { Otp, OtpDocument } from './schemas/otp.schema';
import { Invitation, InvitationDocument, InvitationStatus } from './schemas/invitation.schema';
import { AccountStatus } from '../users/schemas/user.schema';
import { AuditService } from '../audit/audit.service';

const OTP_EXPIRY_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 5;
const SESSION_EXPIRY_DAYS = 7;
const INVITATION_EXPIRY_DAYS = 7;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private auditService: AuditService,
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
    @InjectModel(Otp.name) private otpModel: Model<OtpDocument>,
    @InjectModel(Invitation.name) private invitationModel: Model<InvitationDocument>,
  ) {}

  // ─────────────────────────────────────────
  // LOGIN → Credential check, generate OTP
  // ─────────────────────────────────────────
  async login(email: string, password: string, ipAddress?: string, userAgent?: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) {
      await this.auditService.log({
        action: 'LOGIN_FAILED',
        entityType: 'User',
        metadata: { email: normalizedEmail, reason: 'User not found' },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await this.usersService.validatePassword(password, user.passwordHash);
    if (!isValid) {
      await this.auditService.log({
        actorId: (user._id as Types.ObjectId).toString(),
        action: 'LOGIN_FAILED',
        entityType: 'User',
        entityId: (user._id as Types.ObjectId).toString(),
        metadata: { email: normalizedEmail, reason: 'Invalid password' },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === AccountStatus.SUSPENDED) {
      await this.auditService.log({
        actorId: (user._id as Types.ObjectId).toString(),
        action: 'LOGIN_BLOCKED_SUSPENDED',
        entityType: 'User',
        entityId: (user._id as Types.ObjectId).toString(),
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Account is suspended');
    }
    if (user.status === AccountStatus.DEACTIVATED) {
      await this.auditService.log({
        actorId: (user._id as Types.ObjectId).toString(),
        action: 'LOGIN_BLOCKED_DEACTIVATED',
        entityType: 'User',
        entityId: (user._id as Types.ObjectId).toString(),
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Account is deactivated');
    }

    // Generate cryptographically secure OTP
    const otpPlain = this.generateOtp();
    const otpHash = await bcrypt.hash(otpPlain, 12);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.otpModel.deleteMany({ userId: user._id }); // clear old OTPs
    await this.otpModel.create({ userId: user._id, otpHash, expiresAt, attempts: 0, used: false });

    await this.auditService.log({
      actorId: (user._id as Types.ObjectId).toString(),
      action: 'LOGIN_OTP_SENT',
      entityType: 'User',
      entityId: (user._id as Types.ObjectId).toString(),
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      userId: (user._id as Types.ObjectId).toString(),
      message: 'OTP sent to registered email',
    };
  }

  // ─────────────────────────────────────────
  // VERIFY OTP → Issue JWT token
  // ─────────────────────────────────────────
  async verifyOtp(userId: string, otp: string, ipAddress?: string, userAgent?: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new UnauthorizedException('Invalid authentication session');
    }

    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('Invalid authentication session');

    if (user.status === AccountStatus.SUSPENDED || user.status === AccountStatus.DEACTIVATED) {
      throw new UnauthorizedException('Account is inactive or suspended');
    }

    const otpRecord = await this.otpModel.findOne({
      userId: new Types.ObjectId(userId),
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      await this.auditService.log({
        actorId: (user._id as Types.ObjectId).toString(),
        action: 'OTP_VERIFICATION_FAILED',
        entityType: 'User',
        entityId: (user._id as Types.ObjectId).toString(),
        metadata: { reason: 'OTP expired or not found' },
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('OTP expired or invalid. Please login again.');
    }

    if (otpRecord.attempts >= OTP_MAX_ATTEMPTS) {
      await this.otpModel.findByIdAndUpdate(otpRecord._id, { used: true });
      await this.auditService.log({
        actorId: (user._id as Types.ObjectId).toString(),
        action: 'OTP_MAX_ATTEMPTS_EXCEEDED',
        entityType: 'User',
        entityId: (user._id as Types.ObjectId).toString(),
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Too many invalid attempts. Please request a new OTP.');
    }

    const isValid = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!isValid) {
      await this.otpModel.findByIdAndUpdate(otpRecord._id, { $inc: { attempts: 1 } });
      await this.auditService.log({
        actorId: (user._id as Types.ObjectId).toString(),
        action: 'OTP_INVALID_ATTEMPT',
        entityType: 'User',
        entityId: (user._id as Types.ObjectId).toString(),
        ipAddress,
        userAgent,
      });
      throw new UnauthorizedException('Invalid OTP');
    }

    // Atomically mark OTP as used to prevent replay and race conditions
    const updatedOtp = await this.otpModel.findOneAndUpdate(
      { _id: otpRecord._id, used: false },
      { $set: { used: true } },
      { new: true },
    );

    if (!updatedOtp) {
      throw new UnauthorizedException('OTP has already been used. Please request a new OTP.');
    }

    // Create session + JWT
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await this.sessionModel.create({
      userId: user._id,
      sessionToken,
      ipAddress: ipAddress ? String(ipAddress).substring(0, 100) : undefined,
      userAgent: userAgent ? String(userAgent).substring(0, 255) : undefined,
      expiresAt,
    });

    const token = this.jwtService.sign({
      sub: (user._id as Types.ObjectId).toString(),
      email: user.email,
      sessionToken,
    });

    await this.auditService.log({
      actorId: (user._id as Types.ObjectId).toString(),
      action: 'USER_LOGIN_SUCCESS',
      entityType: 'User',
      entityId: (user._id as Types.ObjectId).toString(),
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      token,
      user: {
        id: (user._id as Types.ObjectId).toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        mustChangePassword: user.mustChangePassword ?? false,
      },
    };
  }

  // ─────────────────────────────────────────
  // RESEND OTP
  // ─────────────────────────────────────────
  async resendOtp(userId: string, ipAddress?: string, userAgent?: string) {
    if (!Types.ObjectId.isValid(userId)) {
      return { success: true, message: 'If this account exists, an OTP has been sent.' };
    }

    const user = await this.usersService.findById(userId);
    if (!user || user.status === AccountStatus.SUSPENDED || user.status === AccountStatus.DEACTIVATED) {
      return { success: true, message: 'If this account exists, an OTP has been sent.' };
    }

    const otpPlain = this.generateOtp();
    const otpHash = await bcrypt.hash(otpPlain, 12);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.otpModel.deleteMany({ userId: user._id });
    await this.otpModel.create({ userId: user._id, otpHash, expiresAt, attempts: 0, used: false });

    await this.auditService.log({
      actorId: (user._id as Types.ObjectId).toString(),
      action: 'OTP_RESENT',
      entityType: 'User',
      entityId: (user._id as Types.ObjectId).toString(),
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      message: 'If this account exists, an OTP has been sent.',
    };
  }

  // ─────────────────────────────────────────
  // FORGOT PASSWORD
  // ─────────────────────────────────────────
  async forgotPassword(email: string, ipAddress?: string, userAgent?: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user || user.status === AccountStatus.SUSPENDED || user.status === AccountStatus.DEACTIVATED) {
      return { success: true, message: 'If this email exists, a password reset link has been dispatched.' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.otpModel.deleteMany({ userId: user._id });
    await this.otpModel.create({
      userId: user._id,
      otpHash: resetTokenHash,
      expiresAt,
      attempts: 0,
      used: false,
    });

    await this.auditService.log({
      actorId: (user._id as Types.ObjectId).toString(),
      action: 'PASSWORD_RESET_REQUESTED',
      entityType: 'User',
      entityId: (user._id as Types.ObjectId).toString(),
      ipAddress,
      userAgent,
    });

    return {
      success: true,
      message: 'If this email exists, a password reset link has been dispatched.',
    };
  }

  // ─────────────────────────────────────────
  // RESET PASSWORD
  // ─────────────────────────────────────────
  async resetPassword(token: string, newPassword: string, ipAddress?: string, userAgent?: string) {
    if (!token || token.length < 16) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const record = await this.otpModel.findOneAndUpdate(
      {
        otpHash: tokenHash,
        used: false,
        expiresAt: { $gt: new Date() },
      },
      { $set: { used: true } },
      { new: false },
    );

    if (!record) throw new BadRequestException('Invalid or expired reset token');

    const hash = await bcrypt.hash(newPassword, 12);
    await this.usersService.updatePassword(record.userId.toString(), hash);

    // Revoke all sessions immediately
    await this.sessionModel.updateMany(
      { userId: record.userId, revokedAt: null },
      { revokedAt: new Date() },
    );

    await this.auditService.log({
      actorId: record.userId.toString(),
      action: 'PASSWORD_RESET_SUCCESS',
      entityType: 'User',
      entityId: record.userId.toString(),
      ipAddress,
      userAgent,
    });

    return { success: true, message: 'Password updated successfully. Please login with your new password.' };
  }

  // ─────────────────────────────────────────
  // CREATE INVITATION (called from EmployeesService)
  // ─────────────────────────────────────────
  async createInvitation(employeeId: string, userId: string, email: string): Promise<{ token: string }> {
    const plainToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex');
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await this.invitationModel.deleteMany({ userId: new Types.ObjectId(userId) });
    await this.invitationModel.create({
      employeeId: new Types.ObjectId(employeeId),
      userId: new Types.ObjectId(userId),
      email: email.toLowerCase().trim(),
      tokenHash,
      status: InvitationStatus.SENT,
      expiresAt,
    });

    return { token: plainToken };
  }

  // ─────────────────────────────────────────
  // SETUP PASSWORD (activate account via invitation)
  // ─────────────────────────────────────────
  async setupPassword(invitationToken: string, password: string, ipAddress?: string, userAgent?: string) {
    if (!invitationToken || invitationToken.length < 16) {
      throw new BadRequestException('Invalid or expired invitation token');
    }

    const tokenHash = crypto.createHash('sha256').update(invitationToken).digest('hex');
    const invitation = await this.invitationModel.findOneAndUpdate(
      {
        tokenHash,
        status: { $in: [InvitationStatus.SENT, InvitationStatus.OPENED] },
        expiresAt: { $gt: new Date() },
      },
      {
        $set: {
          status: InvitationStatus.ACTIVATED,
          activatedAt: new Date(),
        },
      },
      { new: false },
    );

    if (!invitation) throw new BadRequestException('Invalid or expired invitation token');

    const hash = await bcrypt.hash(password, 12);
    await this.usersService.updatePassword(invitation.userId.toString(), hash);
    await this.usersService.updateStatus(invitation.userId.toString(), AccountStatus.ACTIVE);

    await this.auditService.log({
      actorId: invitation.userId.toString(),
      action: 'ACCOUNT_ACTIVATED',
      entityType: 'User',
      entityId: invitation.userId.toString(),
      ipAddress,
      userAgent,
    });

    return { success: true, message: 'Account activated successfully. Please login.' };
  }

  // ─────────────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────────────
  async logout(userId: string, ipAddress?: string, userAgent?: string) {
    if (Types.ObjectId.isValid(userId)) {
      await this.sessionModel.updateMany(
        { userId: new Types.ObjectId(userId), revokedAt: null },
        { revokedAt: new Date() },
      );

      await this.auditService.log({
        actorId: userId,
        action: 'USER_LOGOUT',
        entityType: 'User',
        entityId: userId,
        ipAddress,
        userAgent,
      });
    }
    return { success: true, message: 'Logged out successfully' };
  }

  // ─────────────────────────────────────────
  // GITHUB OAUTH
  // ─────────────────────────────────────────
  async validateGithubUser(email: string, profile: any) {
    const superadminEmail = process.env.SUPERADMIN_EMAIL || '';

    let user = await this.usersService.findByEmail(email);

    if (!user) {
      if (superadminEmail && email.toLowerCase() === superadminEmail.toLowerCase()) {
        const dummyPassword = crypto.randomBytes(32).toString('hex');
        const hash = await bcrypt.hash(dummyPassword, 12);
        
        const firstName = profile.displayName ? profile.displayName.split(' ')[0] : profile.username || 'Super';
        const lastName = profile.displayName ? profile.displayName.split(' ').slice(1).join(' ') : 'Admin';
        
        user = await this.usersService.create(email, hash, firstName, lastName);
        await this.usersService.updateStatus(user._id.toString(), AccountStatus.ACTIVE);
      } else {
        throw new UnauthorizedException('Access Denied: Email not registered in the system.');
      }
    }

    if (user.status === AccountStatus.SUSPENDED) throw new UnauthorizedException('Account is suspended');
    if (user.status === AccountStatus.DEACTIVATED) throw new UnauthorizedException('Account is deactivated');
    
    if (user.status === AccountStatus.INVITED) {
      await this.usersService.updateStatus(user._id.toString(), AccountStatus.ACTIVE);
      user.status = AccountStatus.ACTIVE;
    }

    // Create session + JWT
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    await this.sessionModel.create({
      userId: user._id,
      sessionToken,
      ipAddress: 'github-oauth',
      userAgent: 'github-oauth',
      expiresAt,
    });

    const token = this.jwtService.sign({
      sub: (user._id as Types.ObjectId).toString(),
      email: user.email,
      sessionToken,
    });

    await this.auditService.log({
      actorId: (user._id as Types.ObjectId).toString(),
      action: 'GITHUB_OAUTH_LOGIN',
      entityType: 'User',
      entityId: (user._id as Types.ObjectId).toString(),
    });

    return { token };
  }

  // ─────────────────────────────────────────
  // HELPERS (Cryptographically Secure OTP Generation)
  // ─────────────────────────────────────────
  private generateOtp(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }
}
