import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role, RoleDocument } from './schemas/role.schema';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role.name) private roleModel: Model<RoleDocument>,
    private auditService: AuditService,
  ) {}

  async create(data: { name: string; description?: string; permissions?: string[] }, actorId?: string): Promise<RoleDocument> {
    const exists = await this.roleModel.findOne({ name: data.name }).exec();
    if (exists) throw new ConflictException('Role with this name already exists');
    const role = await this.roleModel.create({ ...data, isSystem: false });

    await this.auditService.log({
      actorId,
      action: 'ROLE_CREATED',
      entityType: 'Role',
      entityId: (role._id as any).toString(),
      after: data,
    });

    return role;
  }

  async findAll(): Promise<RoleDocument[]> {
    const roles = await this.roleModel.find().lean().exec();
    return roles.map((r: any) => ({ ...r, id: r._id.toString() })) as any;
  }

  async findById(id: string): Promise<RoleDocument> {
    const role = await this.roleModel.findById(id).exec();
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async update(id: string, data: any, actorId?: string): Promise<RoleDocument> {
    const role = await this.roleModel.findById(id).exec();
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem && data.name && data.name.trim().toLowerCase() !== role.name.trim().toLowerCase()) throw new ConflictException('Cannot rename system roles');
    const updated = await this.roleModel.findByIdAndUpdate(id, data, { new: true }).exec();

    await this.auditService.log({
      actorId,
      action: 'ROLE_UPDATED',
      entityType: 'Role',
      entityId: id,
      before: role.toObject ? role.toObject() : role,
      after: data,
    });

    return updated!;
  }

  async updatePermissions(id: string, permissions: string[], actorId?: string): Promise<RoleDocument> {
    const role = await this.roleModel.findById(id).exec();
    if (!role) throw new NotFoundException('Role not found');
    const updated = await this.roleModel.findByIdAndUpdate(id, { permissions }, { new: true }).exec();

    await this.auditService.log({
      actorId,
      action: 'ROLE_PERMISSIONS_UPDATED',
      entityType: 'Role',
      entityId: id,
      before: { permissions: role.permissions },
      after: { permissions },
    });

    return updated!;
  }

  async delete(id: string, actorId?: string): Promise<void> {
    const role = await this.roleModel.findById(id).exec();
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new ConflictException('Cannot delete system roles');
    await this.roleModel.deleteOne({ _id: id }).exec();

    await this.auditService.log({
      actorId,
      action: 'ROLE_DELETED',
      entityType: 'Role',
      entityId: id,
      before: { name: role.name },
    });
  }

  async seedSystemRoles(): Promise<void> {
    const systemRoles = [
      { name: 'Super Admin', description: 'Full system access', isSystem: true, permissions: ['*'] },
      { name: 'Admin', description: 'Administrative access', isSystem: true, permissions: [] },
      { name: 'Manager', description: 'Department/team management', isSystem: true, permissions: [] },
      { name: 'Employee', description: 'Standard employee access', isSystem: true, permissions: [] },
    ];

    for (const role of systemRoles) {
      await this.roleModel.findOneAndUpdate(
        { name: role.name },
        { $setOnInsert: role },
        { upsert: true, new: true }
      ).exec();
    }
  }
}


