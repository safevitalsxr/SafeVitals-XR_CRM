import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type RoleDocument = Role & Document;

@Schema({ timestamps: true, collection: 'roles' })
export class Role {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ default: false })
  isSystem: boolean;

  @Prop({ type: [String], default: [] })
  permissions: string[]; // Array of permission keys like "employees.view.team"

  @Prop({ default: 'Active', enum: ['Active', 'Inactive'] })
  status: string;
}

export const RoleSchema = SchemaFactory.createForClass(Role);
