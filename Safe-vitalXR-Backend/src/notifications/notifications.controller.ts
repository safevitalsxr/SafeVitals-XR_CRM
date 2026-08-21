import { Controller, Get, Post, Delete, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class RegisterDeviceTokenDto {
  @ApiProperty({ description: 'Push notification device token (FCM, APNs, Expo)' })
  @IsString()
  token: string;

  @ApiPropertyOptional({ enum: ['ios', 'android', 'web', 'unknown'], default: 'unknown' })
  @IsOptional()
  @IsEnum(['ios', 'android', 'web', 'unknown'])
  platform?: string;

  @ApiPropertyOptional({ example: 'device-unique-uuid-1234' })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiPropertyOptional({ example: '1.4.0' })
  @IsOptional()
  @IsString()
  appVersion?: string;
}

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  findMyNotifications(@CurrentUser('_id') userId: string, @Query('page') page = '1') {
    return this.service.findByUser(userId.toString(), +page);
  }

  @Get('unread-count')
  countUnread(@CurrentUser('_id') userId: string) {
    return this.service.countUnread(userId.toString());
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @CurrentUser('_id') userId: string) {
    return this.service.markRead(id, userId.toString());
  }

  @Patch('mark-all-read')
  markAllRead(@CurrentUser('_id') userId: string) {
    return this.service.markAllRead(userId.toString());
  }

  @Post('device-token')
  @ApiOperation({ summary: 'Register mobile push notification device token (FCM/APNs/Expo)' })
  registerDeviceToken(
    @CurrentUser('_id') userId: string,
    @Body() dto: RegisterDeviceTokenDto,
  ) {
    return this.service.registerDeviceToken(userId.toString(), dto);
  }

  @Delete('device-token/:token')
  @ApiOperation({ summary: 'Unregister mobile push notification device token' })
  unregisterDeviceToken(
    @CurrentUser('_id') userId: string,
    @Param('token') token: string,
  ) {
    return this.service.unregisterDeviceToken(userId.toString(), token);
  }
}

