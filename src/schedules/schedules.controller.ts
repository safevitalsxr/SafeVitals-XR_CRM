import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional } from 'class-validator';

export class CreateScheduleDto {
  @IsString()
  name: string;

  @IsString()
  startTime: string; // e.g. '09:00'

  @IsString()
  endTime: string; // e.g. '17:00'

  @IsArray()
  @IsString({ each: true })
  workDays: string[]; // e.g. ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
}

export class UpdateScheduleDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() startTime?: string;
  @IsOptional() @IsString() endTime?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) workDays?: string[];
}

@ApiTags('Schedules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedules: SchedulesService) {}

  @Get()
  @ApiOperation({ summary: 'List work schedules' })
  findAll() {
    return this.schedules.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get schedule by ID' })
  findOne(@Param('id') id: string) {
    return this.schedules.findById(id);
  }

  @Post()
  @Roles('Super Admin', 'Admin', 'HR Admin')
  @ApiOperation({ summary: 'Create work schedule (Admin only)' })
  create(@Body() dto: CreateScheduleDto) {
    return this.schedules.create(dto);
  }

  @Put(':id')
  @Roles('Super Admin', 'Admin', 'HR Admin')
  @ApiOperation({ summary: 'Update work schedule (Admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    return this.schedules.update(id, dto);
  }

  @Delete(':id')
  @Roles('Super Admin', 'Admin', 'HR Admin')
  @ApiOperation({ summary: 'Delete work schedule (Admin only)' })
  delete(@Param('id') id: string) {
    return this.schedules.delete(id);
  }
}

