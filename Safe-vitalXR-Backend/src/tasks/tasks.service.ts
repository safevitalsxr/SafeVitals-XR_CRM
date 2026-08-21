import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument } from './schemas/task.schema';

@Injectable()
export class TasksService {
  constructor(@InjectModel(Task.name) private model: Model<TaskDocument>) {}

  async create(data: any) {
    const task = { ...data };
    if (data.assignedTo) task.assignedTo = new Types.ObjectId(data.assignedTo);
    if (data.assignedBy) task.assignedBy = new Types.ObjectId(data.assignedBy);
    if (data.departmentId) task.departmentId = new Types.ObjectId(data.departmentId);
    if (data.teamId) task.teamId = new Types.ObjectId(data.teamId);
    return this.model.create(task);
  }

  async findAll(employeeId?: string, status?: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const filter: any = {};
    if (employeeId) filter.assignedTo = new Types.ObjectId(employeeId);
    if (status) filter.status = status;
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('assignedTo').lean(),
      this.model.countDocuments(filter),
    ]);
    return { data, total, page, limit };
  }

  async findById(id: string): Promise<TaskDocument> {
    const task = await this.model.findById(id).populate('assignedTo').exec();
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async updateStatus(id: string, status: string) {
    const task = await this.model.findByIdAndUpdate(id, { status }, { new: true }).exec();
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async update(id: string, data: any) {
    const task = await this.model.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }
}
