import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AttendanceDocument = Attendance & Document;

export type AttendanceEventType = 'CHECK_IN' | 'BREAK_START' | 'BREAK_END' | 'CHECK_OUT';

@Schema({ _id: false })
class BreakEntry {
  @Prop({ required: true })
  start: Date;

  @Prop()
  end?: Date;
}

@Schema({ _id: false })
export class GeoLocation {
  @Prop({ required: true })
  latitude: number;

  @Prop({ required: true })
  longitude: number;

  @Prop()
  accuracy?: number;

  @Prop()
  address?: string;
}

@Schema({ _id: false })
export class DeviceInfo {
  @Prop()
  platform?: string; // 'ios' | 'android' | 'web' | etc.

  @Prop()
  deviceId?: string;

  @Prop()
  appVersion?: string;

  @Prop()
  ip?: string;
}

@Schema({ timestamps: true, collection: 'attendance' })
export class Attendance {
  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true, index: true })
  employeeId: Types.ObjectId;

  @Prop({ required: true, index: true })
  date: string; // YYYY-MM-DD

  @Prop()
  checkInAt?: Date;

  @Prop({ type: GeoLocation })
  checkInLocation?: GeoLocation;

  @Prop({ type: DeviceInfo })
  checkInDevice?: DeviceInfo;

  @Prop()
  checkOutAt?: Date;

  @Prop({ type: GeoLocation })
  checkOutLocation?: GeoLocation;

  @Prop({ type: DeviceInfo })
  checkOutDevice?: DeviceInfo;

  @Prop({ type: [BreakEntry], default: [] })
  breaks: BreakEntry[];

  @Prop()
  workingMinutes?: number;

  @Prop()
  breakMinutes?: number;

  @Prop()
  overtimeMinutes?: number;

  @Prop({ enum: ['Working', 'On Break', 'Late', 'Checked Out', 'Absent', 'On Leave'], default: 'Absent' })
  status: string;

  @Prop({ default: false })
  isLate: boolean;
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);
AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ date: 1, status: 1 });

