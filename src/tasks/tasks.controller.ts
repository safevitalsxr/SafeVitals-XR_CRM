import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsMongoId, IsDateString } from 'class-validator';

export class CreateTaskDto {
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsMongoId() assignedTo: string;
  @IsOptional() @IsMongoId() departmentId?: string;
  @IsOptional() @IsMongoId() teamId?: string;
  @IsOptional() @IsEnum(['Low', 'Medium', 'High', 'Urgent']) priority?: string;
  @IsOptional() @IsDateString() dueDate?: string;
}

export class UpdateTaskDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsMongoId() assignedTo?: string;
  @IsOptional() @IsEnum(['Low', 'Medium', 'High', 'Urgent']) priority?: string;
  @IsOptional() @IsEnum(['To Do', 'In Progress', 'Blocked', 'Done', 'Cancelled']) status?: string;
  @IsOptional() @IsDateString() dueDate?: string;
}

export class UpdateStatusDto {
  @IsEnum(['To Do', 'In Progress', 'Blocked', 'Done', 'Cancelled'])
  status: string;
}

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'List tasks with status & employee filtering' })
  findAll(
    @Query('employeeId') empId?: string,
    @Query('status') status?: string,
    @Query('page') page = '1',
    @CurrentUser() user?: any,
  ) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    // Non-admin can only see tasks assigned to them
    const targetEmpId = !user.isSuperAdmin && !['Admin', 'HR Admin', 'Manager'].includes(user.role)
      ? user.employeeDocId
      : empId;

    return this.tasks.findAll(targetEmpId, status, p);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const task = await this.tasks.findById(id);
    if (!user.isSuperAdmin && !['Admin', 'HR Admin', 'Manager'].includes(user.role)) {
      const taskAssigneeId = (task.assignedTo as any)?._id
        ? (task.assignedTo as any)._id.toString()
        : task.assignedTo?.toString();
      if (taskAssigneeId !== user.employeeDocId) {
        throw new ForbiddenException('Access denied: You are not assigned to this task');
      }
    }
    return task;
  }

  @Post()
  @Roles('Super Admin', 'Admin', 'Manager')
  @ApiOperation({ summary: 'Create and assign task (Admin/Manager only)' })
  create(@Body() dto: CreateTaskDto, @CurrentUser() user: any) {
    const assignedBy = user.employeeDocId || user._id.toString();
    return this.tasks.create({ ...dto, assignedBy });
  }

  @Put(':id')
  @Roles('Super Admin', 'Admin', 'Manager')
  @ApiOperation({ summary: 'Update task details (Admin/Manager only)' })
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasks.update(id, dto);
  }

  @Delete(':id')
  @Roles('Super Admin', 'Admin', 'Manager')
  @ApiOperation({ summary: 'Delete task (Admin/Manager only)' })
  delete(@Param('id') id: string) {
    return this.tasks.delete(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update task status' })
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto, @CurrentUser() user: any) {
    // Verify task assignment
    const task = await this.tasks.findById(id);
    if (!user.isSuperAdmin && !['Admin', 'Manager'].includes(user.role)) {
      const taskAssigneeId = (task.assignedTo as any)?._id
        ? (task.assignedTo as any)._id.toString()
        : task.assignedTo.toString();
      if (taskAssigneeId !== user.employeeDocId) {
        throw new ForbiddenException('Access denied: You are not assigned to this task');
      }
    }
    return this.tasks.updateStatus(id, dto.status);
  }
}

