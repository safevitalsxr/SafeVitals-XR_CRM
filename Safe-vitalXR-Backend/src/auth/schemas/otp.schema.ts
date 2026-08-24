import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OtpDocument = Otp & Document;

@Schema({ timestamps: true, collection: 'otps' })
export class Otp {
  @Prop({ type: Types.ObjectId, ref: 'User', index: true }) // Optional: null for pre-registration OTPs
  userId: Types.ObjectId;

  @Prop({ index: true }) // Email for pre-user registration OTPs
  email?: string;

  @Prop({ default: 'LOGIN', enum: ['LOGIN', 'REGISTRATION'] })
  purpose: string;

  @Prop({ required: true })
  otpHash: string; // Store hashed OTP, never plain

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: 0 })
  attempts: number;

  @Prop({ default: false })
  used: boolean;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);
// Auto-delete expired OTPs
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
