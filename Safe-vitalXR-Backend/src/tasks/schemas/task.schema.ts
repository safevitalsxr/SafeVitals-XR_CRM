import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TaskDocument = Task & Document;

@Schema({ timestamps: true, collection: 'tasks' })
export class Task {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop()
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true, index: true })
  assignedTo: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true })
  assignedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Department' })
  departmentId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Team' })
  teamId?: Types.ObjectId;

  @Prop({ enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' })
  priority: string;

  @Prop({ enum: ['To Do', 'In Progress', 'Blocked', 'Done', 'Cancelled'], default: 'To Do' })
  status: string;

  @Prop()
  dueDate?: Date;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
TaskSchema.index({ assignedTo: 1, status: 1 });
TaskSchema.index({ status: 1, priority: 1 });
