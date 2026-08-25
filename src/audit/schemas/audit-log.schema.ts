import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

@Schema({ timestamps: true, collection: 'audit_logs' })
export class AuditLog {
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  actorId: Types.ObjectId | null; // Who did it

  @Prop({ required: true })
  action: string; // e.g. 'EMPLOYEE_CREATED'

  @Prop()
  entityType?: string; // e.g. 'Employee'

  @Prop()
  entityId?: string; // e.g. objectid of the employee

  @Prop({ type: Object })
  before?: Record<string, any>; // State before the action

  @Prop({ type: Object })
  after?: Record<string, any>; // State after the action

  @Prop({ type: Object })
  metadata?: Record<string, any>; // Extra context

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1 });
AuditLogSchema.index({ createdAt: -1 });
