import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, UseGuards, ForbiddenException, BadRequestException } from '@nestjs/common';
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

  @IsOptional() @IsString() completionReport?: string;
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
    const assignedByName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'A team member';
    return this.tasks.create({ ...dto, assignedBy }, assignedByName);
  }

  @Put(':id')
  @Roles('Super Admin', 'Admin', 'Manager')
  @ApiOperation({ summary: 'Update task details (only the person who assigned the task)' })
  async update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @CurrentUser() user: any) {
    await this.verifyAssigner(id, user);
    return this.tasks.update(id, dto);
  }

  @Delete(':id')
  @Roles('Super Admin', 'Admin', 'Manager')
  @ApiOperation({ summary: 'Delete task (only the person who assigned the task)' })
  async delete(@Param('id') id: string, @CurrentUser() user: any) {
    await this.verifyAssigner(id, user);
    return this.tasks.delete(id);
  }

  /**
   * Only the person who originally assigned a task may edit or delete it -
   * sharing the Admin/Manager/Super Admin role does not grant access to each other's tasks.
   */
  private async verifyAssigner(id: string, user: any) {
    const task = await this.tasks.findById(id);
    const assignerId = (task.assignedBy as any)?._id
      ? (task.assignedBy as any)._id.toString()
      : task.assignedBy?.toString();
    if (assignerId !== user.employeeDocId) {
      throw new ForbiddenException('Access denied: only the person who assigned this task can edit or delete it');
    }
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update task status (only the assignee can move their own task)' })
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto, @CurrentUser() user: any) {
    // Only the assignee can change their task's status - being an Admin/Manager/Super
    // Admin who merely assigned or can view the task does not grant this on its own.
    const task = await this.tasks.findById(id);
    const taskAssigneeId = (task.assignedTo as any)?._id
      ? (task.assignedTo as any)._id.toString()
      : task.assignedTo.toString();
    if (taskAssigneeId !== user.employeeDocId) {
      throw new ForbiddenException('Access denied: You are not assigned to this task');
    }
    if (dto.status === 'Done' && !dto.completionReport?.trim()) {
      throw new BadRequestException('A completion report is required to mark this task as Done');
    }
    const assigneeName = user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'The assignee';
    return this.tasks.updateStatus(id, dto.status, dto.completionReport, assigneeName);
  }
}

