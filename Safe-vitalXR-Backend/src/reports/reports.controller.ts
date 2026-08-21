import {
  Controller, Get, Post, Patch, Param, Body, Query, UseGuards,
  UseInterceptors, UploadedFiles, ForbiddenException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ReportsService } from './reports.service';
import { StorageService } from '../common/services/storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateReportDto {
  @IsString() weekStartDate: string;
  @IsString() weekEndDate: string;
  @IsString() workedOn: string;
  @IsString() completed: string;
  @IsString() blockers: string;
  @IsString() nextWeekPlan: string;
}

export class ReviewReportDto {
  @IsEnum(['Under Review', 'Needs Revision', 'Approved']) status: string;
  @IsOptional() @IsString() reviewMessage?: string;
}

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly storage: StorageService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List weekly reports' })
  findAll(@Query('status') status?: string, @Query('page') page = '1', @CurrentUser() user?: any) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    if (!user.isSuperAdmin && !['Admin', 'HR Admin', 'Manager'].includes(user.role)) {
      if (user.employeeDocId) {
        return this.reports.findByEmployee(user.employeeDocId, p);
      }
    }
    return this.reports.findAll(status, p);
  }

  @Get('employee/:id')
  @ApiOperation({ summary: 'Get reports by employee' })
  findByEmployee(@Param('id') id: string, @Query('page') page = '1', @CurrentUser() user?: any) {
    if (!user.isSuperAdmin && !['Admin', 'HR Admin', 'Manager'].includes(user.role)) {
      if (user.employeeDocId !== id && user.employeeId !== id) {
        throw new ForbiddenException('Access denied: You cannot view reports for another employee');
      }
    }
    const p = Math.max(1, parseInt(page, 10) || 1);
    return this.reports.findByEmployee(id, p);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get report by ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const report = await this.reports.findById(id);
    if (!user.isSuperAdmin && !['Admin', 'HR Admin', 'Manager'].includes(user.role)) {
      const empId = (report.employeeId as any)?._id
        ? (report.employeeId as any)._id.toString()
        : report.employeeId.toString();
      if (empId !== user.employeeDocId) {
        throw new ForbiddenException('Access denied: You are not authorized to view this report');
      }
    }
    return report;
  }

  @Post()
  @UseInterceptors(FilesInterceptor('files', 5, { limits: { fileSize: 10 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create weekly report with attachments' })
  async create(
    @Body() body: CreateReportDto,
    @CurrentUser() user: any,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const employeeId = user.employeeDocId || user._id.toString();
    const uploadedPaths: string[] = [];
    const attachments = [];

    try {
      if (files && files.length > 0) {
        for (const file of files) {
          this.storage.validateFile(file);
          const sanitizedFilename = this.storage.sanitizeFilename(file.originalname);
          const path = `reports/${employeeId}/${Date.now()}-${sanitizedFilename}`;

          const { publicUrl } = await this.storage.uploadFile('safevitals', path, file.buffer, file.mimetype);
          uploadedPaths.push(path);

          attachments.push({
            id: Date.now().toString(),
            name: sanitizedFilename,
            url: publicUrl,
            size: file.size,
          });
        }
      }

      return await this.reports.create(employeeId, {
        ...body,
        attachments,
      });
    } catch (err) {
      // Compensating action: Delete uploaded files if DB insert fails
      for (const path of uploadedPaths) {
        await this.storage.deleteFile('safevitals', path);
      }
      throw err;
    }
  }

  @Patch(':id/submit')
  @ApiOperation({ summary: 'Submit draft report for review' })
  async submit(@Param('id') id: string, @CurrentUser() user: any) {
    await this.findOne(id, user); // Verify ownership
    return this.reports.submit(id);
  }

  @Patch(':id/review')
  @Roles('Super Admin', 'Admin', 'Manager')
  @ApiOperation({ summary: 'Review and approve/reject report (Manager/Admin only)' })
  review(@Param('id') id: string, @Body() body: ReviewReportDto, @CurrentUser() user: any) {
    const reviewerId = user.employeeDocId || user._id.toString();
    return this.reports.review(id, reviewerId, body.status, body.reviewMessage);
  }
}

