import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LeaveRequest, LeaveRequestSchema } from './schemas/leave-request.schema';
import { LeaveService } from './leave.service';
import { LeaveController } from './leave.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: LeaveRequest.name, schema: LeaveRequestSchema }]),
    AuditModule,
  ],
  controllers: [LeaveController],
  providers: [LeaveService],
  exports: [LeaveService],
})
export class LeaveModule {}
