import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Employee, EmployeeSchema } from './schemas/employee.schema';
import { EmployeeCounter, EmployeeCounterSchema } from './schemas/employee-counter.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { EmployeesService } from './employees.service';
import { EmployeesController } from './employees.controller';
import { UsersModule } from '../users/users.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../common/email/email.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Employee.name, schema: EmployeeSchema },
      { name: EmployeeCounter.name, schema: EmployeeCounterSchema },
      { name: User.name, schema: UserSchema },
    ]),
    UsersModule,
    AuthModule,
    AuditModule,
    EmailModule,
  ],
  controllers: [EmployeesController],
  providers: [EmployeesService],
  exports: [EmployeesService],
})
export class EmployeesModule {}
