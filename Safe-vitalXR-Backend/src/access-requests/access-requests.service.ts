import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AccessRequest, AccessRequestDocument } from './schemas/access-request.schema';

@Injectable()
export class AccessRequestsService {
  constructor(@InjectModel(AccessRequest.name) private model: Model<AccessRequestDocument>) {}

  async create(employeeId: string, requestedSystem: string, reason: string) {
    return this.model.create({ employeeId: new Types.ObjectId(employeeId), requestedSystem, reason });
  }

  async findAll(status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const filter: any = {};
    if (status) filter.status = status;
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('employeeId reviewerId').lean(),
      this.model.countDocuments(filter),
    ]);
    return { data, total, page, limit };
  }

  async findByEmployee(employeeId: string) {
    return this.model.find({ employeeId: new Types.ObjectId(employeeId) }).sort({ createdAt: -1 }).lean();
  }

  async review(id: string, reviewerId: string, status: 'Approved' | 'Rejected', note?: string) {
    const req = await this.model.findById(id).exec();
    if (!req) throw new NotFoundException('Access request not found');
    if (req.status !== 'Pending') throw new ForbiddenException('Request already reviewed');

    return this.model.findByIdAndUpdate(id, {
      status,
      reviewerId: new Types.ObjectId(reviewerId),
      reviewNote: note,
      reviewedAt: new Date(),
    }, { new: true }).exec();
  }
}
