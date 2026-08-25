import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WorkSchedule, WorkScheduleDocument } from './schemas/work-schedule.schema';

@Injectable()
export class SchedulesService {
  constructor(@InjectModel(WorkSchedule.name) private model: Model<WorkScheduleDocument>) {}

  async create(data: any) { return this.model.create(data); }
  async findAll() {
    const docs = await this.model.find().lean().exec();
    return docs.map((d: any) => ({ ...d, id: d._id.toString() }));
  }
  async findById(id: string) {
    const s = await this.model.findById(id).exec();
    if (!s) throw new NotFoundException('Schedule not found');
    return s;
  }
  async update(id: string, data: any) {
    const s = await this.model.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!s) throw new NotFoundException('Schedule not found');
    return s;
  }
  async delete(id: string) {
    await this.model.findByIdAndDelete(id).exec();
    return { success: true };
  }
}
