import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// Counter for auto-incremented Employee IDs (safe concurrent generation)
export type EmployeeCounterDocument = EmployeeCounter & Document;

@Schema({ collection: 'employee_counters' })
export class EmployeeCounter {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ required: true, default: 0 })
  count: number;
}

export const EmployeeCounterSchema = SchemaFactory.createForClass(EmployeeCounter);
