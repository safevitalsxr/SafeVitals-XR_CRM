import { Controller, Get, Post, Param, Body, Query, UseGuards, HttpCode, HttpStatus, ForbiddenException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class GeoLocationDto {
  @ApiPropertyOptional({ example: 37.7749 })
  @IsNumber()
  latitude: number;

  @ApiPropertyOptional({ example: -122.4194 })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ example: 10.5 })
  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @ApiPropertyOptional({ example: '123 Tech Park Blvd, Suite 400' })
  @IsOptional()
  @IsString()
  address?: string;
}

export class DeviceInfoDto {
  @ApiPropertyOptional({ example: 'ios' })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({ example: 'iPhone-15-Pro-001' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ example: '1.4.0' })
  @IsOptional()
  @IsString()
  appVersion?: string;
}

export class CheckInOutDto {
  @ApiPropertyOptional({ type: GeoLocationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GeoLocationDto)
  location?: GeoLocationDto;

  @ApiPropertyOptional({ type: DeviceInfoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  device?: DeviceInfoDto;
}

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  private verifyEmployeeAccess(user: any, targetEmployeeId: string) {
    if (user.isSuperAdmin || ['Admin', 'HR Admin', 'Manager'].includes(user.role)) {
      return;
    }
    if (user.employeeDocId !== targetEmployeeId && user.employeeId !== targetEmployeeId) {
      throw new ForbiddenException('Access denied: You cannot access attendance records for another employee');
    }
  }

  @Get()
  findAll(
    @Query('date') date?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
    @CurrentUser() user?: any,
  ) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    // Non-admin can only fetch their own attendance
    if (!user?.isSuperAdmin && !['Admin', 'HR Admin', 'Manager'].includes(user?.role)) {
      if (user?.employeeDocId) {
        return this.attendance.findByEmployee(user.employeeDocId, p, l);
      }
    }
    return this.attendance.findAll(date, p, l);
  }

  @Get('me/today')
  getTodayStatus(@CurrentUser() user: any) {
    const targetId = user.employeeDocId || user._id.toString();
    return this.attendance.getTodayStatus(targetId);
  }

  @Get('employee/:employeeId')
  findByEmployee(
    @Param('employeeId') employeeId: string,
    @Query('page') page = '1',
    @Query('limit') limit = '30',
    @CurrentUser() user?: any,
  ) {
    this.verifyEmployeeAccess(user, employeeId);
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
    return this.attendance.findByEmployee(employeeId, p, l);
  }

  @Post('check-in/:employeeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check in employee (supports mobile GPS coordinates and device info)' })
  checkIn(
    @Param('employeeId') employeeId: string,
    @Body() dto?: CheckInOutDto,
    @CurrentUser() user?: any,
  ) {
    this.verifyEmployeeAccess(user, employeeId);
    return this.attendance.checkIn(employeeId, dto?.location, dto?.device);
  }

  @Post('break-start/:employeeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start break' })
  startBreak(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user?: any,
  ) {
    this.verifyEmployeeAccess(user, employeeId);
    return this.attendance.startBreak(employeeId);
  }

  @Post('break-end/:employeeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End break' })
  endBreak(
    @Param('employeeId') employeeId: string,
    @CurrentUser() user?: any,
  ) {
    this.verifyEmployeeAccess(user, employeeId);
    return this.attendance.endBreak(employeeId);
  }

  @Post('check-out/:employeeId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check out employee (supports mobile GPS coordinates and device info)' })
  checkOut(
    @Param('employeeId') employeeId: string,
    @Body() dto?: CheckInOutDto,
    @CurrentUser() user?: any,
  ) {
    this.verifyEmployeeAccess(user, employeeId);
    return this.attendance.checkOut(employeeId, dto?.location, dto?.device);
  }
}


