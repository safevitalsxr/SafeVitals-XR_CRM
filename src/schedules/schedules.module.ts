import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkSchedule, WorkScheduleSchema } from './schemas/work-schedule.schema';
import { SchedulesService } from './schedules.service';
import { SchedulesController } from './schedules.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: WorkSchedule.name, schema: WorkScheduleSchema }])],
  controllers: [SchedulesController],
  providers: [SchedulesService],
  exports: [SchedulesService],
})
export class SchedulesModule {}
