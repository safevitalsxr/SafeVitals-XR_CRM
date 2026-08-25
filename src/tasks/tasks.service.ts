import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument } from './schemas/task.schema';
import { toObjectId } from '../common/utils/mongo.util';

@Injectable()
export class TasksService {
  constructor(@InjectModel(Task.name) private model: Model<TaskDocument>) {}

  async create(data: any) {
    const task = { ...data };
    if (data.assignedTo) task.assignedTo = toObjectId(data.assignedTo) as any;
    if (data.assignedBy) task.assignedBy = toObjectId(data.assignedBy) as any;
    if (data.departmentId) task.departmentId = toObjectId(data.departmentId) as any;
    if (data.teamId) task.teamId = toObjectId(data.teamId) as any;
    return this.model.create(task);
  }

  async findAll(employeeId?: string, status?: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const filter: any = {};
    if (employeeId) filter.assignedTo = toObjectId(employeeId);
    if (status) filter.status = status;
    const [docs, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('assignedTo').lean(),
      this.model.countDocuments(filter),
    ]);
    const data = docs.map((d: any) => ({ ...d, id: d._id.toString() }));
    return { data, total, page, limit };
  }

  async findById(id: string): Promise<TaskDocument> {
    const task = await this.model.findById(id).populate('assignedTo').exec();
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async delete(id: string) {
    const t = await this.taskModel.findByIdAndDelete(id).exec();
    if (!t) throw new NotFoundException('Task not found');
    return { success: true };
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
