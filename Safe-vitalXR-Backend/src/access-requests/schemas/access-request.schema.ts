import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AccessRequestDocument = AccessRequest & Document;

@Schema({ timestamps: true, collection: 'access_requests' })
export class AccessRequest {
  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true, index: true })
  employeeId: Types.ObjectId;

  @Prop({ required: true })
  requestedSystem: string;

  @Prop({ required: true })
  reason: string;

  @Prop({ enum: ['Pending', 'Approved', 'Rejected', 'Expired'], default: 'Pending' })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'Employee', default: null })
  reviewerId: Types.ObjectId | null;

  @Prop()
  reviewNote?: string;

  @Prop()
  reviewedAt?: Date;
}

export const AccessRequestSchema = SchemaFactory.createForClass(AccessRequest);
