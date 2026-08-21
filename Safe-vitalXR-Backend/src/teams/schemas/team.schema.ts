import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TeamDocument = Team & Document;

@Schema({ timestamps: true, collection: 'teams' })
export class Team {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'Department', required: true, index: true })
  departmentId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Employee', default: null })
  leadId: Types.ObjectId | null;

  @Prop({ default: 'Active', enum: ['Active', 'Archived'] })
  status: string;
}

export const TeamSchema = SchemaFactory.createForClass(Team);
