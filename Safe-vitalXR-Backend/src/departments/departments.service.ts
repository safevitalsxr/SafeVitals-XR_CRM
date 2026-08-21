import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Department, DepartmentDocument } from './schemas/department.schema';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';

@Injectable()
export class DepartmentsService {
  constructor(@InjectModel(Department.name) private deptModel: Model<DepartmentDocument>) {}

  async create(dto: CreateDepartmentDto): Promise<DepartmentDocument> {
    return this.deptModel.create(dto);
  }

  async findAll(): Promise<DepartmentDocument[]> {
    return this.deptModel.find({ status: 'Active' }).lean().exec();
  }

  async findById(id: string): Promise<DepartmentDocument> {
    const dept = await this.deptModel.findById(id).exec();
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async update(id: string, dto: UpdateDepartmentDto): Promise<DepartmentDocument> {
    const dept = await this.deptModel.findByIdAndUpdate(id, dto, { new: true }).exec();
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async archive(id: string): Promise<DepartmentDocument> {
    const dept = await this.deptModel.findByIdAndUpdate(id, { status: 'Archived' }, { new: true }).exec();
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }

  async reactivate(id: string): Promise<DepartmentDocument> {
    const dept = await this.deptModel.findByIdAndUpdate(id, { status: 'Active' }, { new: true }).exec();
    if (!dept) throw new NotFoundException('Department not found');
    return dept;
  }
}
