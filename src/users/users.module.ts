import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { Employee, EmployeeSchema } from '../employees/schemas/employee.schema';
import { EmployeeCounter, EmployeeCounterSchema } from '../employees/schemas/employee-counter.schema';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { FirebaseModule } from '../common/firebase/firebase.module';
import { EmailModule } from '../common/email/email.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }, { name: Employee.name, schema: EmployeeSchema }, { name: EmployeeCounter.name, schema: EmployeeCounterSchema }]),
    FirebaseModule,
    EmailModule
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}


