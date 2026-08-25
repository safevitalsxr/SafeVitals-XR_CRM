import { Controller, Get, Post, Put, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Departments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly depts: DepartmentsService) {}

  @Get()
  @ApiOperation({ summary: 'List all departments' })
  findAll() {
    return this.depts.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get department by ID' })
  findOne(@Param('id') id: string) {
    return this.depts.findById(id);
  }

  @Post()
  @Roles('Super Admin', 'Admin')
  @ApiOperation({ summary: 'Create department (Admin only)' })
  create(@Body() dto: CreateDepartmentDto) {
    return this.depts.create(dto);
  }

  @Put(':id')
  @Roles('Super Admin', 'Admin')
  @ApiOperation({ summary: 'Update department (Admin only)' })
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.depts.update(id, dto);
  }

  @Patch(':id/archive')
  @Roles('Super Admin', 'Admin')
  @ApiOperation({ summary: 'Archive department (Admin only)' })
  archive(@Param('id') id: string) {
    return this.depts.archive(id);
  }

  @Patch(':id/reactivate')
  @Roles('Super Admin', 'Admin')
  @ApiOperation({ summary: 'Reactivate department (Admin only)' })
  reactivate(@Param('id') id: string) {
    return this.depts.reactivate(id);
  }
}

