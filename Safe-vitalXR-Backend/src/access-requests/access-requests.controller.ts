import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { AccessRequestsService } from './access-requests.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateAccessRequestDto {
  @IsOptional() @IsString() employeeId?: string;
  @IsString() requestedSystem: string;
  @IsString() reason: string;
}

export class ReviewDto {
  @IsEnum(['Approved', 'Rejected']) status: 'Approved' | 'Rejected';
  @IsOptional() @IsString() note?: string;
}

@ApiTags('Access Requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('access-requests')
export class AccessRequestsController {
  constructor(private readonly service: AccessRequestsService) {}

  @Get()
  @ApiOperation({ summary: 'List system access requests' })
  findAll(@Query('status') status?: string, @Query('page') page = '1', @CurrentUser() user?: any) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    if (!user.isSuperAdmin && !['Admin', 'HR Admin'].includes(user.role)) {
      if (user.employeeDocId) {
        return this.service.findByEmployee(user.employeeDocId);
      }
    }
    return this.service.findAll(status, p);
  }

  @Get('employee/:id')
  @ApiOperation({ summary: 'Get access requests by employee' })
  findByEmployee(@Param('id') id: string, @CurrentUser() user: any) {
    if (!user.isSuperAdmin && !['Admin', 'HR Admin'].includes(user.role)) {
      if (user.employeeDocId !== id && user.employeeId !== id) {
        throw new ForbiddenException('Access denied: You cannot view access requests for another employee');
      }
    }
    return this.service.findByEmployee(id);
  }

  @Post()
  @ApiOperation({ summary: 'Submit access request' })
  create(@Body() dto: CreateAccessRequestDto, @CurrentUser() user: any) {
    const targetEmployeeId = user.isSuperAdmin || ['Admin', 'HR Admin'].includes(user.role)
      ? dto.employeeId || user.employeeDocId
      : user.employeeDocId;

    if (!targetEmployeeId) {
      throw new ForbiddenException('Employee profile required to submit access requests');
    }

    return this.service.create(targetEmployeeId, dto.requestedSystem, dto.reason);
  }

  @Patch(':id/review')
  @Roles('Super Admin', 'Admin')
  @ApiOperation({ summary: 'Review access request (Admin only)' })
  review(@Param('id') id: string, @Body() dto: ReviewDto, @CurrentUser() user: any) {
    const reviewerId = user.employeeDocId || user._id.toString();
    return this.service.review(id, reviewerId, dto.status, dto.note);
  }
}

