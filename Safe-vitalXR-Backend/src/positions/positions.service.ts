import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Position, PositionDocument } from './schemas/position.schema';
import { toObjectId } from '../common/utils/mongo.util';

@Injectable()
export class PositionsService {
  constructor(@InjectModel(Position.name) private posModel: Model<PositionDocument>) {}

  async create(data: any): Promise<PositionDocument> {
    return this.posModel.create({ ...data, departmentId: toObjectId(data.departmentId) });
  }

  async findAll(departmentId?: string): Promise<PositionDocument[]> {
    const filter: any = { status: 'Active' };
    if (departmentId) filter.departmentId = toObjectId(departmentId);
    const pos = await this.posModel.find(filter).populate('departmentId').lean().exec();
    return pos.map((p: any) => ({ ...p, id: p._id.toString() })) as any;
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
