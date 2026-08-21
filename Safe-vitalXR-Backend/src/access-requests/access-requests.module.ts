import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccessRequest, AccessRequestSchema } from './schemas/access-request.schema';
import { AccessRequestsService } from './access-requests.service';
import { AccessRequestsController } from './access-requests.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: AccessRequest.name, schema: AccessRequestSchema }])],
  controllers: [AccessRequestsController],
  providers: [AccessRequestsService],
  exports: [AccessRequestsService],
})
export class AccessRequestsModule {}
