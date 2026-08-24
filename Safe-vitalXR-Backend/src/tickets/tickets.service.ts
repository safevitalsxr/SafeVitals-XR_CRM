import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Ticket, TicketDocument, TicketStatus, TicketPriority } from './schemas/ticket.schema';
import { toObjectId } from '../common/utils/mongo.util';

@Injectable()
export class TicketsService {
  constructor(@InjectModel(Ticket.name) private model: Model<TicketDocument>) {}

  private async generateTicketNumber(): Promise<string> {
    const count = await this.model.countDocuments();
    return `TKT-${(count + 1).toString().padStart(5, '0')}`;
  }

  async create(data: { createdBy: string; category: string; title: string; description: string; priority?: string }) {
    const ticketNumber = await this.generateTicketNumber();
    return this.model.create({
      ...data,
      ticketNumber,
      createdBy: toObjectId(data.createdBy),
    });
  }

  async findAll(status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const filter: any = {};
    if (status) filter.status = status;
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('createdBy assignedTo').lean(),
      this.model.countDocuments(filter),
    ]);
    return { data, total, page, limit };
  }

  async findByEmployee(employeeId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const filter = { createdBy: toObjectId(employeeId) };
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.model.countDocuments(filter),
    ]);
    return { data, total, page, limit };
  }

  async findById(id: string): Promise<TicketDocument> {
    const ticket = await this.model.findById(id).populate('createdBy assignedTo').exec();
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async updateStatus(id: string, status: string) {
    const ticket = await this.model.findByIdAndUpdate(id, { status }, { new: true }).exec();
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async resolve(id: string) {
    return this.updateStatus(id, 'Resolved');
  }

  async addMessage(id: string, authorId: string, content: string) {
    const ticket = await this.model.findById(id).exec();
    if (!ticket) throw new NotFoundException('Ticket not found');
    ticket.messages.push({ authorId: toObjectId(authorId) as any, content, createdAt: new Date() });
    return ticket.save();
  }
}
