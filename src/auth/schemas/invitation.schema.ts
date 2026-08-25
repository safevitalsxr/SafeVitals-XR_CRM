import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InvitationDocument = Invitation & Document;

export enum InvitationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  OPENED = 'OPENED',
  ACTIVATED = 'ACTIVATED',
  EXPIRED = 'EXPIRED',
  REVOKED = 'REVOKED',
}

@Schema({ timestamps: true, collection: 'invitations' })
export class Invitation {
  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true })
  employeeId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, lowercase: true })
  email: string;

  @Prop({ required: true, unique: true })
  tokenHash: string; // Hash of the invitation token, never stored plain

  @Prop({ enum: InvitationStatus, default: InvitationStatus.PENDING })
  status: InvitationStatus;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop()
  activatedAt?: Date;
}

export const InvitationSchema = SchemaFactory.createForClass(Invitation);
