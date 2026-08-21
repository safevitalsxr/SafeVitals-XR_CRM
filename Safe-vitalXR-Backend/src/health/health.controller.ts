import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'General health status' })
  getHealth() {
    const isDbConnected = this.connection.readyState === 1;
    return {
      status: isDbConnected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      dependencies: {
        database: isDbConnected ? 'healthy' : 'unhealthy',
      },
    };
  }

  @Public()
  @Get('live')
  @ApiOperation({ summary: 'Kubernetes/Docker liveness probe' })
  getLiveness() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Kubernetes/Docker readiness probe' })
  getReadiness() {
    const isDbConnected = this.connection.readyState === 1;
    if (!isDbConnected) {
      throw new ServiceUnavailableException({
        status: 'error',
        message: 'Database connection is not ready',
        timestamp: new Date().toISOString(),
      });
    }
    return { status: 'ready', timestamp: new Date().toISOString() };
  }
}
