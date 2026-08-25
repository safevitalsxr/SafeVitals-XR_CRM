import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';

@Injectable()
export class AuditService {
  constructor(
    @InjectModel(AuditLog.name) private auditModel: Model<AuditLogDocument>,
  ) {}

  async log(data: {
    actorId?: string;
    action: string;
    entityType?: string;
    entityId?: string;
    before?: any;
    after?: any;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    const entry = new this.auditModel({
      actorId: data.actorId ? new Types.ObjectId(data.actorId) : null,
      action: data.action,
      entityType: data.entityType,
      entityId: data.entityId,
      before: data.before,
      after: data.after,
      metadata: data.metadata,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
    });
    return entry.save();
  }

  async findAll(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      this.auditModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate('actorId').lean(),
      this.auditModel.countDocuments(),
    ]);
    const data = docs.map((d: any) => ({ ...d, id: d._id.toString() }));
    return { data, total, page, limit };
  }
}
