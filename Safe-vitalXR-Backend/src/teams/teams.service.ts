import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Team, TeamDocument } from './schemas/team.schema';
import { toObjectId } from '../common/utils/mongo.util';

@Injectable()
export class TeamsService {
  constructor(@InjectModel(Team.name) private teamModel: Model<TeamDocument>) {}

  async create(name: string, departmentId: string, leadId?: string): Promise<TeamDocument> {
    return this.teamModel.create({ name, departmentId: toObjectId(departmentId), leadId: leadId ? toObjectId(leadId) : null });
  }

  async findAll(departmentId?: string): Promise<TeamDocument[]> {
    const filter: any = { status: 'Active' };
    if (departmentId) filter.departmentId = toObjectId(departmentId);
    const teams = await this.teamModel.find(filter).populate('departmentId').populate('leadId').lean().exec();
    return teams.map((t: any) => ({ ...t, id: t._id.toString() })) as any;
  }

  async findById(id: string): Promise<TeamDocument> {
    const team = await this.teamModel.findById(id).exec();
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async update(id: string, data: any): Promise<TeamDocument> {
    const team = await this.teamModel.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }

  async archive(id: string): Promise<TeamDocument> {
    const team = await this.teamModel.findByIdAndUpdate(id, { status: 'Archived' }, { new: true }).exec();
    if (!team) throw new NotFoundException('Team not found');
    return team;
  }
}
