import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LeaveRequest, LeaveRequestDocument } from './schemas/leave-request.schema';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class LeaveService {
  constructor(
    @InjectModel(LeaveRequest.name) private model: Model<LeaveRequestDocument>,
    private auditService: AuditService,
  ) {}

  async apply(employeeId: string, data: {
    leaveType: string; startDate: string; endDate: string; reason: string;
  }, actorId?: string) {
    const leave = await this.model.create({ employeeId: new Types.ObjectId(employeeId), ...data });

    await this.auditService.log({
      actorId: actorId || employeeId,
      action: 'LEAVE_APPLIED',
      entityType: 'LeaveRequest',
      entityId: (leave._id as any).toString(),
      after: { employeeId, ...data },
    });

    return leave;
  }

  async findByEmployee(employeeId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const filter = { employeeId: new Types.ObjectId(employeeId) };
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.model.countDocuments(filter),
    ]);
    return { data, total, page, limit };
  }

  async findAll(status?: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const filter: any = {};
    if (status) filter.status = status;
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('employeeId').lean(),
      this.model.countDocuments(filter),
    ]);
    return { data, total, page, limit };
  }

  async review(id: string, reviewerId: string, status: 'Approved' | 'Rejected', note?: string) {
    const leave = await this.model.findById(id).exec();
    if (!leave) throw new NotFoundException('Leave request not found');
    if (leave.status !== 'Pending') throw new ForbiddenException('Leave request already reviewed');

    const updated = await this.model.findByIdAndUpdate(id, {
      status,
      reviewerId: new Types.ObjectId(reviewerId),
      reviewNote: note,
      reviewedAt: new Date(),
    }, { new: true }).exec();

    await this.auditService.log({
      actorId: reviewerId,
      action: status === 'Approved' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
      entityType: 'LeaveRequest',
      entityId: id,
      before: { status: leave.status },
      after: { status, reviewNote: note },
    });

    return updated;
  }

  async cancel(id: string, employeeId: string) {
    const leave = await this.model.findById(id).exec();
    if (!leave) throw new NotFoundException('Leave request not found');
    if (leave.employeeId.toString() !== employeeId) throw new ForbiddenException('Not authorized');
    if (leave.status !== 'Pending') throw new ForbiddenException('Cannot cancel a reviewed request');

    const updated = await this.model.findByIdAndUpdate(id, { status: 'Rejected' }, { new: true }).exec();

    await this.auditService.log({
      actorId: employeeId,
      action: 'LEAVE_CANCELLED',
      entityType: 'LeaveRequest',
      entityId: id,
    });

    return updated;
  }
}
