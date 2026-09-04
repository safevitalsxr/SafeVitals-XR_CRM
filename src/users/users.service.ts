import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Model } from 'mongoose';
import { User, UserDocument, AccountStatus } from './schemas/user.schema';
import { Employee, EmployeeDocument } from '../employees/schemas/employee.schema';
import { EmployeeCounter, EmployeeCounterDocument } from '../employees/schemas/employee-counter.schema';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { FirebaseService } from '../common/firebase/firebase.service';
import { EmailService } from '../common/email/email.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) public userModel: Model<UserDocument>,
    @InjectModel(Employee.name) private employeeModel: Model<EmployeeDocument>,
    @InjectModel(EmployeeCounter.name) private counterModel: Model<EmployeeCounterDocument>,
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

  async updatePassword(userId: string, newPasswordHash: string, markSetupComplete = false): Promise<void> {
    const update: any = { passwordHash: newPasswordHash, mustChangePassword: false };
    if (markSetupComplete) update.passwordSetupComplete = true;
    await this.userModel.findByIdAndUpdate(userId, update).exec();
  }

  async setPasswordSetupComplete(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { passwordSetupComplete: true }).exec();
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
        status: AccountStatus.PENDING_APPROVAL,
        createdAt: { $lt: twentyFourHoursAgo },
      }).exec();
      
      this.logger.log(`Cleanup complete: Purged ${result.deletedCount} unverified users.`);
    } catch (error: any) {
      this.logger.error(`Failed to cleanup pending users: ${error.message}`);
    }
  }

    private async generateEmployeeId(): Promise<string> {
    const counter = await this.counterModel.findOneAndUpdate(
      { key: 'employee_id' },
      { $inc: { count: 1 } },
      { upsert: true, new: true },
    );
    const num = counter!.count.toString().padStart(6, '0');
    return "EMP-$num";
  }

  async getPendingUsers(): Promise<UserDocument[]> {
    return this.userModel.find({ status: AccountStatus.PENDING_APPROVAL }).exec();
  }

  async approveUser(userId: string, dto: any): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    if (user.status !== AccountStatus.PENDING_APPROVAL) throw new BadRequestException('User is not pending approval');

    user.status = AccountStatus.ACTIVE;
    await user.save();

    const employeeId = await this.generateEmployeeId();
    const createPayload: any = {
      userId: user._id,
      employeeId,
      departmentId: dto.departmentId ? dto.departmentId : null,
      teamId: dto.teamId ? dto.teamId : null,
      positionId: dto.positionId ? dto.positionId : null,
      roleId: dto.roleId ? dto.roleId : null,
      managerId: dto.managerId ? dto.managerId : null,
      joiningDate: new Date().toISOString().split('T')[0],
    };
    if (user.firebaseUid) createPayload.firebaseUid = user.firebaseUid;

    const newEmployee = new this.employeeModel(createPayload);
    await newEmployee.save();

    const emailHtml = `<h2>Your SafeVitals XR Account is Approved!</h2><p>Hello ${user.firstName},</p><p>An administrator has approved your account. You can now log in using the credentials you created during registration.</p><p><b>Email:</b> ${user.email}</p>`;
    await this.emailService.send({ to: user.email, subject: 'SafeVitals XR - Account Approved', html: emailHtml });
    
    return user;
  }
}




