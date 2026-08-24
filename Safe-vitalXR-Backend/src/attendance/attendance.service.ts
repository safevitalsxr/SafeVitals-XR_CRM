import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Attendance, AttendanceDocument } from './schemas/attendance.schema';
import { toObjectId } from '../common/utils/mongo.util';

@Injectable()
export class AttendanceService {
  constructor(@InjectModel(Attendance.name) private model: Model<AttendanceDocument>) {}

  private today(): string {
    return new Date().toISOString().split('T')[0];
  }

  async checkIn(
    employeeId: string,
    location?: { latitude: number; longitude: number; accuracy?: number; address?: string },
    device?: { platform?: string; deviceId?: string; appVersion?: string; ip?: string },
  ) {
    const date = this.today();
    const existing = await this.model.findOne({ employeeId: toObjectId(employeeId), date }).exec();
    if (existing?.checkInAt) throw new BadRequestException('Already checked in today');

    const payload: any = {
      checkInAt: new Date(),
      status: 'Working',
    };
    if (location) payload.checkInLocation = location;
    if (device) payload.checkInDevice = device;

    const record = existing
      ? await this.model.findByIdAndUpdate(existing._id, payload, { new: true }).exec()
      : await this.model.create({
          employeeId: toObjectId(employeeId),
          date,
          ...payload,
        });
    return record;
  }

  async startBreak(employeeId: string) {
    const date = this.today();
    const record = await this.model.findOne({ employeeId: toObjectId(employeeId), date }).exec();
    if (!record?.checkInAt) throw new BadRequestException('Not checked in');
    if (record.status === 'On Break') throw new BadRequestException('Already on break');

    record.breaks.push({ start: new Date() });
    record.status = 'On Break';
    return record.save();
  }

  async endBreak(employeeId: string) {
    const date = this.today();
    const record = await this.model.findOne({ employeeId: toObjectId(employeeId), date }).exec();
    if (!record || record.status !== 'On Break') throw new BadRequestException('Not on break');

    const openBreak = record.breaks.find(b => !b.end);
    if (openBreak) openBreak.end = new Date();
    record.status = 'Working';
    return record.save();
  }

  async checkOut(
    employeeId: string,
    location?: { latitude: number; longitude: number; accuracy?: number; address?: string },
    device?: { platform?: string; deviceId?: string; appVersion?: string; ip?: string },
  ) {
    const date = this.today();
    const record = await this.model.findOne({ employeeId: toObjectId(employeeId), date }).exec();
    if (!record?.checkInAt) throw new BadRequestException('Not checked in');
    if (record.checkOutAt) throw new BadRequestException('Already checked out');

    // Calculate working time
    const checkOutTime = new Date();
    const totalMs = checkOutTime.getTime() - record.checkInAt.getTime();
    const breakMs = record.breaks.reduce((acc, b) => {
      if (b.start && b.end) return acc + (b.end.getTime() - b.start.getTime());
      return acc;
    }, 0);

    const workingMinutes = Math.floor((totalMs - breakMs) / 60000);
    const breakMinutes = Math.floor(breakMs / 60000);

    record.checkOutAt = checkOutTime;
    record.workingMinutes = workingMinutes;
    record.breakMinutes = breakMinutes;
    record.status = 'Checked Out';
    if (location) record.checkOutLocation = location as any;
    if (device) record.checkOutDevice = device as any;
    return record.save();
  }

  async findByEmployee(employeeId: string, page = 1, limit = 30) {
    const skip = (page - 1) * limit;
    const filter = { employeeId: toObjectId(employeeId) };
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ date: -1 }).skip(skip).limit(limit).lean(),
      this.model.countDocuments(filter),
    ]);
    return { data, total, page, limit };
  }

  async findAll(date?: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const filter: any = {};
    if (date) filter.date = date;
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('employeeId').lean(),
      this.model.countDocuments(filter),
    ]);
    return { data, total, page, limit };
  }

  async getTodayStatus(employeeId: string) {
    const date = this.today();
    return this.model.findOne({ employeeId: toObjectId(employeeId), date }).exec();
  }
}
