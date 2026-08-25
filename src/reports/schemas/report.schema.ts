import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReportDocument = WeeklyReport & Document;

@Schema({ _id: false })
class Attachment {
  @Prop({ required: true }) id: string;
  @Prop({ required: true }) name: string;
  @Prop({ required: true }) url: string;
  @Prop({ required: true }) size: number;
}

@Schema({ timestamps: true, collection: 'reports' })
export class WeeklyReport {
  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true, index: true })
  employeeId: Types.ObjectId;

  @Prop({ required: true })
  weekStartDate: string;

  @Prop({ required: true })
  weekEndDate: string;

  @Prop({ required: true })
  workedOn: string;

  @Prop({ required: true })
  completed: string;

  @Prop({ required: true })
  blockers: string;

  @Prop({ required: true })
  nextWeekPlan: string;

  @Prop({ enum: ['Draft', 'Submitted', 'Under Review', 'Needs Revision', 'Approved'], default: 'Draft' })
  status: string;

  @Prop()
  submittedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Employee', default: null })
  reviewerId: Types.ObjectId | null;

  @Prop()
  reviewMessage?: string;

  @Prop({ type: [Attachment], default: [] })
  attachments: Attachment[];
}

export const ReportSchema = SchemaFactory.createForClass(WeeklyReport);
ReportSchema.index({ employeeId: 1, status: 1 });
ReportSchema.index({ status: 1, weekStartDate: -1 });
