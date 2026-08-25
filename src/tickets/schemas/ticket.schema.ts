import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TicketDocument = Ticket & Document;

@Schema({ _id: false })
class TicketMessage {
  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true })
  authorId: Types.ObjectId;
  @Prop({ required: true })
  content: string;
  @Prop({ default: Date.now })
  createdAt: Date;
}

@Schema({ timestamps: true, collection: 'tickets' })
export class Ticket {
  @Prop({ required: true, unique: true, index: true })
  ticketNumber: string; // e.g. TKT-00001

  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true, index: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Employee', default: null })
  assignedTo: Types.ObjectId | null;

  @Prop({ enum: ['IT Support', 'HR', 'Facilities', 'Other'], required: true })
  category: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ enum: ['Low', 'Medium', 'High', 'Urgent'], default: 'Medium' })
  priority: string;

  @Prop({ enum: ['Open', 'In Progress', 'Waiting', 'Resolved', 'Closed'], default: 'Open' })
  status: string;

  @Prop({ type: [TicketMessage], default: [] })
  messages: TicketMessage[];
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);
TicketSchema.index({ createdBy: 1, status: 1 });
TicketSchema.index({ status: 1, priority: 1 });
