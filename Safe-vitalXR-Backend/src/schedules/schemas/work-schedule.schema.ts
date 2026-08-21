import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WorkScheduleDocument = WorkSchedule & Document;

@Schema({ timestamps: true, collection: 'work_schedules' })
export class WorkSchedule {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: [Number], default: [1, 2, 3, 4, 5] }) // 0=Sun, 1=Mon...
  workingDays: number[];

  @Prop({ required: true, default: '09:00' })
  startTime: string;

  @Prop({ required: true, default: '18:00' })
  endTime: string;

  @Prop({ default: '13:00' })
  breakStartTime: string;

  @Prop({ default: '14:00' })
  breakEndTime: string;

  @Prop({ default: 10 })
  gracePeriodMinutes: number;

  @Prop({ default: 8 })
  overtimeThresholdHours: number;

  @Prop({ default: 'Asia/Kolkata' })
  timezone: string;
}

export const WorkScheduleSchema = SchemaFactory.createForClass(WorkSchedule);
