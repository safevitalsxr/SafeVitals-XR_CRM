import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OtpDocument = Otp & Document;

@Schema({ timestamps: true, collection: 'otps' })
export class Otp {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

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
