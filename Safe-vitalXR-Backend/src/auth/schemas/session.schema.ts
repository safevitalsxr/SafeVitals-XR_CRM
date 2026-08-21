import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SessionDocument = Session & Document;

@Schema({ timestamps: true, collection: 'sessions' })
export class Session {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  sessionToken: string;

  @Prop()
  ipAddress: string;

  @Prop()
  userAgent: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ type: Date, default: null })
  revokedAt: Date | null;

  @Prop({ default: Date.now })
  lastActivityAt: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
