import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WeeklyReport, ReportSchema } from './schemas/report.schema';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { StorageService } from '../common/services/storage.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: WeeklyReport.name, schema: ReportSchema }])],
  controllers: [ReportsController],
  providers: [ReportsService, StorageService],
  exports: [ReportsService],
})
export class ReportsModule {}
