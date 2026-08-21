import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Position, PositionDocument } from './schemas/position.schema';

@Injectable()
export class PositionsService {
  constructor(@InjectModel(Position.name) private posModel: Model<PositionDocument>) {}

  async create(data: any): Promise<PositionDocument> {
    return this.posModel.create({ ...data, departmentId: new Types.ObjectId(data.departmentId) });
  }

  async findAll(departmentId?: string): Promise<PositionDocument[]> {
    const filter: any = { status: 'Active' };
    if (departmentId) filter.departmentId = new Types.ObjectId(departmentId);
    return this.posModel.find(filter).lean().exec();
  }

  async findById(id: string): Promise<PositionDocument> {
    const pos = await this.posModel.findById(id).exec();
    if (!pos) throw new NotFoundException('Position not found');
    return pos;
  }

  async update(id: string, data: any): Promise<PositionDocument> {
    const pos = await this.posModel.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!pos) throw new NotFoundException('Position not found');
    return pos;
  }
}
