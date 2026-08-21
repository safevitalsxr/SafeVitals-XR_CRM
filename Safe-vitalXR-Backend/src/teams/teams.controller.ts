import { Controller, Get, Post, Put, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsMongoId } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  name: string;

  @IsMongoId()
  departmentId: string;

  @IsOptional()
  @IsMongoId()
  leadId?: string;
}

export class UpdateTeamDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsMongoId()
  departmentId?: string;

  @IsOptional()
  @IsMongoId()
  leadId?: string;
}

@ApiTags('Teams')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('teams')
export class TeamsController {
  constructor(private readonly teams: TeamsService) {}

  @Get()
  @ApiOperation({ summary: 'List teams (filtered by department)' })
  findAll(@Query('departmentId') deptId?: string) {
    return this.teams.findAll(deptId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team details by ID' })
  findOne(@Param('id') id: string) {
    return this.teams.findById(id);
  }

  @Post()
  @Roles('Super Admin', 'Admin', 'Manager')
  @ApiOperation({ summary: 'Create team (Admin/Manager)' })
  create(@Body() dto: CreateTeamDto) {
    return this.teams.create(dto.name, dto.departmentId, dto.leadId);
  }

  @Put(':id')
  @Roles('Super Admin', 'Admin', 'Manager')
  @ApiOperation({ summary: 'Update team (Admin/Manager)' })
  update(@Param('id') id: string, @Body() dto: UpdateTeamDto) {
    return this.teams.update(id, dto);
  }

  @Patch(':id/archive')
  @Roles('Super Admin', 'Admin')
  @ApiOperation({ summary: 'Archive team (Admin only)' })
  archive(@Param('id') id: string) {
    return this.teams.archive(id);
  }
}

