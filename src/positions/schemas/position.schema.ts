import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PositionDocument = Position & Document;

@Schema({ timestamps: true, collection: 'positions' })
export class Position {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'Department', required: false, index: true })
  departmentId: Types.ObjectId;

  @Prop({ enum: ['Intern', 'Junior', 'Mid-Level', 'Senior', 'Lead', 'Head', 'Custom'], default: 'Mid-Level' })
  level: string;

  @Prop({ default: 'Active', enum: ['Active', 'Archived'] })
  status: string;
}

export const PositionSchema = SchemaFactory.createForClass(Position);
