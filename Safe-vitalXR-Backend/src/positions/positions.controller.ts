import { Controller, Get, Post, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { PositionsService } from './positions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsMongoId } from 'class-validator';

export class CreatePositionDto {
  @IsString()
  name: string;

  @IsMongoId()
  departmentId: string;

  @IsOptional()
  @IsString()
  level?: string;
}

export class UpdatePositionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsMongoId()
  departmentId?: string;

  @IsOptional()
  @IsString()
  level?: string;
}

@ApiTags('Positions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('positions')
export class PositionsController {
  constructor(private readonly positions: PositionsService) {}

  @Get()
  @ApiOperation({ summary: 'List positions (filtered by department)' })
  findAll(@Query('departmentId') deptId?: string) {
    return this.positions.findAll(deptId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get position by ID' })
  findOne(@Param('id') id: string) {
    return this.positions.findById(id);
  }

  @Post()
  @Roles('Super Admin', 'Admin')
  @ApiOperation({ summary: 'Create position (Admin only)' })
  create(@Body() dto: CreatePositionDto) {
    return this.positions.create(dto);
  }

  @Put(':id')
  @Roles('Super Admin', 'Admin')
  @ApiOperation({ summary: 'Update position (Admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdatePositionDto) {
    return this.positions.update(id, dto);
  }
}

