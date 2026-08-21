import { Module } from '@nestjs/common';
import { MobileController } from './mobile.controller';
import { EmployeesModule } from '../employees/employees.module';
import { AttendanceModule } from '../attendance/attendance.module';
import { TasksModule } from '../tasks/tasks.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SchedulesModule } from '../schedules/schedules.module';

@Module({
  imports: [
    EmployeesModule,
    AttendanceModule,
    TasksModule,
    NotificationsModule,
    SchedulesModule,
  ],
  controllers: [MobileController],
})
export class MobileModule {}
