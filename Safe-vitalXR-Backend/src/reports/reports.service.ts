import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { WeeklyReport, ReportDocument } from './schemas/report.schema';
import { toObjectId } from '../common/utils/mongo.util';

@Injectable()
export class ReportsService {
  constructor(@InjectModel(WeeklyReport.name) private model: Model<ReportDocument>) {}

  async create(employeeId: string, data: any) {
    return this.model.create({ ...data, employeeId: toObjectId(employeeId) });
  }

  async findAll(status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const filter: any = {};
    if (status) filter.status = status;
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('employeeId').lean(),
      this.model.countDocuments(filter),
    ]);
    return { data, total, page, limit };
  }

  async findByEmployee(employeeId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const filter = { employeeId: toObjectId(employeeId) };
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.model.countDocuments(filter),
    ]);
    return { data, total, page, limit };
  }

  async findById(id: string) {
    const report = await this.model.findById(id).populate('employeeId reviewerId').exec();
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  async update(id: string, data: any) {
    const report = await this.model.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  async submit(id: string) {
    return this.update(id, { status: 'Submitted', submittedAt: new Date() });
  }

  async review(id: string, reviewerId: string, status: string, reviewMessage?: string) {
    return this.update(id, { status, reviewMessage, reviewerId: new Types.ObjectId(reviewerId) });
  }
}
