import { Controller, Get, Post, Put, Delete, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

export class UpdatePermissionsDto {
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  @Roles('Super Admin', 'Admin', 'HR Admin')
  @ApiOperation({ summary: 'List all system roles' })
  findAll() {
    return this.roles.findAll();
  }

  @Get(':id')
  @Roles('Super Admin', 'Admin', 'HR Admin')
  @ApiOperation({ summary: 'Get role details by ID' })
  findOne(@Param('id') id: string) {
    return this.roles.findById(id);
  }

  @Post()
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Create new role (Super Admin only)' })
  create(@Body() dto: CreateRoleDto, @CurrentUser('_id') actorId?: string) {
    return this.roles.create(dto, actorId?.toString());
  }

  @Put(':id')
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Update role (Super Admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto, @CurrentUser('_id') actorId?: string) {
    return this.roles.update(id, dto, actorId?.toString());
  }

  @Patch(':id/permissions')
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Update role permissions (Super Admin only)' })
  updatePermissions(@Param('id') id: string, @Body() dto: UpdatePermissionsDto, @CurrentUser('_id') actorId?: string) {
    return this.roles.updatePermissions(id, dto.permissions, actorId?.toString());
  }

  @Delete(':id')
  @Roles('Super Admin')
  @ApiOperation({ summary: 'Delete role (Super Admin only)' })
  delete(@Param('id') id: string, @CurrentUser('_id') actorId?: string) {
    return this.roles.delete(id, actorId?.toString());
  }
}

