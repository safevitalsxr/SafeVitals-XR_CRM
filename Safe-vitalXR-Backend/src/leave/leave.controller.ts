import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export class ApplyLeaveDto {
  @IsOptional() @IsString() employeeId?: string;
  @IsEnum(['Casual', 'Sick', 'Earned', 'Unpaid']) leaveType: string;
  @IsString() startDate: string;
  @IsString() endDate: string;
  @IsString() reason: string;
}

export class ReviewLeaveDto {
  @IsEnum(['Approved', 'Rejected']) status: 'Approved' | 'Rejected';
  @IsOptional() @IsString() note?: string;
}

@ApiTags('Leave')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('leave')
export class LeaveController {
  constructor(private readonly leave: LeaveService) {}

  @Get()
  @ApiOperation({ summary: 'List leave requests' })
  findAll(
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @CurrentUser() user?: any,
  ) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));

    // Non-admin/manager can only view their own leave requests
    if (!user.isSuperAdmin && !['Admin', 'HR Admin', 'Manager'].includes(user.role)) {
      if (user.employeeDocId) {
        return this.leave.findByEmployee(user.employeeDocId, p, l);
      }
    }
    return this.leave.findAll(status, p, l);
  }

  @Get('employee/:employeeId')
  @ApiOperation({ summary: 'Get leave requests by employee' })
  findByEmployee(
    @Param('employeeId') id: string,
    @Query('page') page = '1',
    @CurrentUser() user?: any,
  ) {
    if (!user.isSuperAdmin && !['Admin', 'HR Admin', 'Manager'].includes(user.role)) {
      if (user.employeeDocId !== id && user.employeeId !== id) {
        throw new ForbiddenException('Access denied: You cannot view leave requests for another employee');
      }
    }
    const p = Math.max(1, parseInt(page, 10) || 1);
    return this.leave.findByEmployee(id, p);
  }

  @Post()
  @ApiOperation({ summary: 'Apply for leave' })
  apply(@Body() dto: ApplyLeaveDto, @CurrentUser() user: any) {
    // If not admin, force employeeId to authenticated user's employee ID
    const targetEmployeeId = user.isSuperAdmin || ['Admin', 'HR Admin'].includes(user.role)
      ? dto.employeeId || user.employeeDocId
      : user.employeeDocId;

    if (!targetEmployeeId) {
      throw new ForbiddenException('Employee record required to apply for leave');
    }

    const actorId = user.employeeDocId || user._id?.toString();

    return this.leave.apply(targetEmployeeId, {
      leaveType: dto.leaveType,
      startDate: dto.startDate,
      endDate: dto.endDate,
      reason: dto.reason,
    }, actorId);
  }

  @Patch(':id/review')
  @Roles('Super Admin', 'Admin', 'HR Admin', 'Manager')
  @ApiOperation({ summary: 'Review leave request (Approve/Reject) (Manager/Admin only)' })
  review(@Param('id') id: string, @Body() dto: ReviewLeaveDto, @CurrentUser() user: any) {
    const reviewerId = user.employeeDocId || user._id.toString();
    return this.leave.review(id, reviewerId, dto.status, dto.note);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel pending leave request' })
  cancel(@Param('id') id: string, @CurrentUser() user: any) {
    const requesterId = user.employeeDocId || user._id.toString();
    return this.leave.cancel(id, requesterId);
  }
}

