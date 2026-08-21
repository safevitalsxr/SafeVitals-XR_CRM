import {
  Controller, Get, Post, Put, Patch, Param, Body, Query, UseGuards, ForbiddenException,
} from '@nestjs/common';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto, UpdateEmployeeDto, EmployeeQueryDto } from './dto/employee.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Get()
  @ApiOperation({ summary: 'List employees with pagination and filters' })
  findAll(@Query() query: EmployeeQueryDto) {
    return this.employees.findAll(query);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current employee profile' })
  getMyProfile(@CurrentUser('_id') userId: string) {
    return this.employees.findByUserId(userId.toString());
  }

  @Get('stats')
  @Roles('Super Admin', 'Admin', 'HR Admin', 'Manager')
  @ApiOperation({ summary: 'Get workforce overview stats (Admin/Manager)' })
  getDashboardStats() {
    return this.employees.getDashboardStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get employee by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    // Non-admin can only access their own profile details or directory
    if (!user.isSuperAdmin && !['Admin', 'HR Admin', 'Manager'].includes(user.role)) {
      if (user.employeeDocId !== id && user.employeeId !== id) {
        throw new ForbiddenException('Access denied: You are not authorized to view this employee record');
      }
    }
    return this.employees.findById(id);
  }

  @Post()
  @Roles('Super Admin', 'Admin', 'HR Admin')
  @ApiOperation({ summary: 'Create new employee (Admin/HR only)' })
  create(@Body() dto: CreateEmployeeDto, @CurrentUser('_id') actorId: string) {
    return this.employees.create(dto, actorId?.toString());
  }

  @Put(':id')
  @Roles('Super Admin', 'Admin', 'HR Admin')
  @ApiOperation({ summary: 'Update employee (Admin/HR only)' })
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto, @CurrentUser('_id') actorId: string) {
    return this.employees.update(id, dto, actorId?.toString());
  }

  @Patch(':id/suspend')
  @Roles('Super Admin', 'Admin', 'HR Admin')
  @ApiOperation({ summary: 'Suspend employee account (Admin/HR only)' })
  suspend(@Param('id') id: string, @CurrentUser('_id') actorId: string) {
    return this.employees.suspend(id, actorId?.toString());
  }

  @Patch(':id/deactivate')
  @Roles('Super Admin', 'Admin', 'HR Admin')
  @ApiOperation({ summary: 'Deactivate employee account (Admin/HR only)' })
  deactivate(@Param('id') id: string, @CurrentUser('_id') actorId: string) {
    return this.employees.deactivate(id, actorId?.toString());
  }

  @Patch(':id/reactivate')
  @Roles('Super Admin', 'Admin', 'HR Admin')
  @ApiOperation({ summary: 'Reactivate employee account (Admin/HR only)' })
  reactivate(@Param('id') id: string, @CurrentUser('_id') actorId: string) {
    return this.employees.reactivate(id, actorId?.toString());
  }
}

