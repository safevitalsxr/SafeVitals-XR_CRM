import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Task, TaskSchema } from './schemas/task.schema';
import { Employee, EmployeeSchema } from '../employees/schemas/employee.schema';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { EmailModule } from '../common/email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Task.name, schema: TaskSchema },
      { name: Employee.name, schema: EmployeeSchema },
    ]),
    EmailModule,
    NotificationsModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
