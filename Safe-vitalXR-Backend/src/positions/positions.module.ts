import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Position, PositionSchema } from './schemas/position.schema';
import { PositionsService } from './positions.service';
import { PositionsController } from './positions.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Position.name, schema: PositionSchema }])],
  controllers: [PositionsController],
  providers: [PositionsService],
  exports: [PositionsService],
})
export class PositionsModule {}
