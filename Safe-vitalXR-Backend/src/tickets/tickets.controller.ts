import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateTicketDto {
  @IsEnum(['IT Support', 'HR', 'Facilities', 'Other'])
  category: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsEnum(['Low', 'Medium', 'High', 'Urgent'])
  priority?: string;
}

export class AddMessageDto {
  @IsString()
  content: string;
}

export class UpdateTicketStatusDto {
  @IsEnum(['Open', 'In Progress', 'Waiting', 'Resolved', 'Closed'])
  status: string;
}

@ApiTags('Tickets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get()
  @ApiOperation({ summary: 'List support tickets' })
  findAll(@Query('status') status?: string, @Query('page') page = '1', @CurrentUser() user?: any) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    // Non-admin can only fetch their own tickets
    if (!user.isSuperAdmin && !['Admin', 'HR Admin', 'Manager'].includes(user.role)) {
      if (user.employeeDocId) {
        return this.tickets.findByEmployee(user.employeeDocId);
      }
    }
    return this.tickets.findAll(status, p);
  }

  @Get('employee/:id')
  @ApiOperation({ summary: 'Get tickets by employee' })
  findByEmployee(@Param('id') id: string, @CurrentUser() user: any) {
    if (!user.isSuperAdmin && !['Admin', 'HR Admin', 'Manager'].includes(user.role)) {
      if (user.employeeDocId !== id && user.employeeId !== id) {
        throw new ForbiddenException('Access denied: You cannot view tickets for another employee');
      }
    }
    return this.tickets.findByEmployee(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const ticket = await this.tickets.findById(id);
    if (!user.isSuperAdmin && !['Admin', 'HR Admin', 'Manager'].includes(user.role)) {
      const creatorId = (ticket.createdBy as any)?._id
        ? (ticket.createdBy as any)._id.toString()
        : ticket.createdBy.toString();
      if (creatorId !== user.employeeDocId) {
        throw new ForbiddenException('Access denied: You are not authorized to view this ticket');
      }
    }
    return ticket;
  }

  @Post()
  @ApiOperation({ summary: 'Create support ticket' })
  create(@Body() dto: CreateTicketDto, @CurrentUser() user: any) {
    const createdBy = user.employeeDocId || user._id.toString();
    return this.tickets.create({
      ...dto,
      createdBy,
    });
  }

  @Patch(':id/resolve')
  @Roles('Super Admin', 'Admin', 'HR Admin', 'Manager')
  @ApiOperation({ summary: 'Resolve support ticket (Admin/Manager only)' })
  resolve(@Param('id') id: string) {
    return this.tickets.resolve(id);
  }

  @Patch(':id/status')
  @Roles('Super Admin', 'Admin', 'HR Admin', 'Manager')
  @ApiOperation({ summary: 'Update ticket status (Admin/Manager only)' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateTicketStatusDto) {
    return this.tickets.updateStatus(id, dto.status);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Add message to ticket discussion' })
  addMessage(@Param('id') id: string, @Body() dto: AddMessageDto, @CurrentUser() user: any) {
    const authorId = user.employeeDocId || user._id.toString();
    return this.tickets.addMessage(id, authorId, dto.content);
  }
}

