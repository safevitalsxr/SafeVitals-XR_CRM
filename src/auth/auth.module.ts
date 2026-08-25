import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Session, SessionSchema } from './schemas/session.schema';
import { Otp, OtpSchema } from './schemas/otp.schema';
import { Invitation, InvitationSchema } from './schemas/invitation.schema';
import { UsersModule } from '../users/users.module';
import { GithubStrategy } from './strategies/github.strategy';
import { Employee, EmployeeSchema } from '../employees/schemas/employee.schema';
import { Role, RoleSchema } from '../roles/schemas/role.schema';
import { AuditModule } from '../audit/audit.module';
import { EmailModule } from '../common/email/email.module';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    AuditModule,
    EmailModule,
    MongooseModule.forFeature([
      { name: Session.name, schema: SessionSchema },
      { name: Otp.name, schema: OtpSchema },
      { name: Invitation.name, schema: InvitationSchema },
      { name: Employee.name, schema: EmployeeSchema },
      { name: Role.name, schema: RoleSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('SESSION_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, GithubStrategy],
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}

