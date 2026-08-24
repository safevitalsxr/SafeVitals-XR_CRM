import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';

// Feature Modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EmployeesModule } from './employees/employees.module';
import { DepartmentsModule } from './departments/departments.module';
import { TeamsModule } from './teams/teams.module';
import { PositionsModule } from './positions/positions.module';
import { RolesModule } from './roles/roles.module';
import { AttendanceModule } from './attendance/attendance.module';
import { LeaveModule } from './leave/leave.module';
import { TasksModule } from './tasks/tasks.module';
import { TicketsModule } from './tickets/tickets.module';
import { AccessRequestsModule } from './access-requests/access-requests.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SchedulesModule } from './schedules/schedules.module';
import { AuditModule } from './audit/audit.module';
import { ReportsModule } from './reports/reports.module';
import { MobileModule } from './mobile/mobile.module';
import { HealthModule } from './health/health.module';
import { EmailModule } from './common/email/email.module';
import { FirebaseModule } from './common/firebase/firebase.module';

// Common
import { validateEnv } from './common/config/env.validation';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),

    // Feature modules
    AuthModule,
    UsersModule,
    EmployeesModule,
    DepartmentsModule,
    TeamsModule,
    PositionsModule,
    RolesModule,
    AttendanceModule,
    LeaveModule,
    TasksModule,
    TicketsModule,
    AccessRequestsModule,
    NotificationsModule,
    SchedulesModule,
    AuditModule,
    ReportsModule,
    MobileModule,
    HealthModule,
    EmailModule,
    FirebaseModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}

