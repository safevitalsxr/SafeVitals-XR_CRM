import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EmployeeDocument = Employee & Document;

@Schema({ timestamps: true, collection: 'employees' })
export class Employee {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  employeeId: string; // e.g. EMP-000001

  @Prop({ type: Types.ObjectId, ref: 'Department' })
  departmentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Team' })
  teamId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Position' })
  positionId: Types.ObjectId;

  @Prop()
  positionTitle: string; // Denormalized for display

  @Prop({ type: Types.ObjectId, ref: 'Role', required: true })
  roleId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Employee', default: null })
  managerId: Types.ObjectId | null;

  @Prop({ type: Types.ObjectId, ref: 'WorkSchedule' })
  workScheduleId: Types.ObjectId;

  @Prop({ required: true })
  joiningDate: string;

  @Prop()
  secondaryEmail?: string;

  @Prop()
  phone?: string;

  @Prop()
  address?: string;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);
