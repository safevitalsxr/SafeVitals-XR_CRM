import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

export enum AccountStatus {
  INVITED = 'INVITED',
  PENDING_APPROVAL = 'PENDING_APPROVAL', // Self-registered, awaiting admin role assignment
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  DEACTIVATED = 'DEACTIVATED',
}

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ required: false })
  passwordHash?: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ enum: AccountStatus, default: AccountStatus.INVITED })
  status: AccountStatus;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ default: false, required: false })
  mustChangePassword?: boolean;

  @Prop({ sparse: true, index: true })
  firebaseUid?: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ required: false })
  registrationOtp?: string;

  @Prop({ required: false })
  registrationOtpExpiry?: Date;

  @Prop({ required: false, index: true })
  registrationToken?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
