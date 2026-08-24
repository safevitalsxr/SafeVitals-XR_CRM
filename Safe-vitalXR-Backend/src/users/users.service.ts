import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { User, UserDocument, AccountStatus } from './schemas/user.schema';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { FirebaseService } from '../common/firebase/firebase.service';
import { EmailService } from '../common/email/email.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) public userModel: Model<UserDocument>,
    private firebaseService: FirebaseService,
    private emailService: EmailService,
  ) {}

  async create(
    email: string,
    passwordHash: string | undefined,
    firstName: string,
    lastName: string,
    mustChangePassword = false,
    options?: { phone?: string; status?: AccountStatus },
  ): Promise<UserDocument> {
    const user = new this.userModel({
      email: email.toLowerCase().trim(),
      ...(passwordHash ? { passwordHash } : {}),
      firstName,
      lastName,
      mustChangePassword,
      ...(options?.phone ? { phone: options.phone } : {}),
      ...(options?.status ? { status: options.status } : {}),
    });
    return user.save();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async updateStatus(userId: string, status: AccountStatus): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(userId, { status }, { new: true }).exec();
  }

  async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { passwordHash: newPasswordHash, mustChangePassword: false }).exec();
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async validatePassword(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCleanupPendingUsers() {
    this.logger.log('Running nightly cleanup of unverified PENDING users...');
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    try {
      const result = await this.userModel.deleteMany({
        status: AccountStatus.PENDING,
        createdAt: { $lt: twentyFourHoursAgo },
      }).exec();
      
      this.logger.log(`Cleanup complete: Purged ${result.deletedCount} unverified users.`);
    } catch (error: any) {
      this.logger.error(`Failed to cleanup pending users: ${error.message}`);
    }
  }

  async approveUser(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.status !== AccountStatus.PENDING_APPROVAL) {
      throw new BadRequestException('User is not pending approval');
    }

    // 1. Update MongoDB User Status
    user.status = AccountStatus.ACTIVE;
    await user.save();

    // 2. Send Email Notification
    const emailHtml = `
      <h2>Your SafeVitals XR Account is Approved!</h2>
      <p>Hello ${user.firstName},</p>
      <p>An administrator has approved your account. You can now log in using the credentials you created during registration.</p>
      <p><b>Email:</b> ${user.email}</p>
    `;
    
    await this.emailService.send({
      to: user.email,
      subject: 'SafeVitals XR - Account Approved',
      html: emailHtml,
    });

    return user;
  }
}
