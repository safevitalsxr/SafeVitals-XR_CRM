import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, AccountStatus } from './schemas/user.schema';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(email: string, passwordHash: string, firstName: string, lastName: string, mustChangePassword = false): Promise<UserDocument> {
    const user = new this.userModel({ email: email.toLowerCase().trim(), passwordHash, firstName, lastName, mustChangePassword });
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
}
