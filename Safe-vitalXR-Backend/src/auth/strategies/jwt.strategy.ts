import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UsersService } from '../../users/users.service';
import { Employee, EmployeeDocument } from '../../employees/schemas/employee.schema';
import { Session, SessionDocument } from '../schemas/session.schema';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    @InjectModel(Employee.name) private employeeModel: Model<EmployeeDocument>,
    @InjectModel(Session.name) private sessionModel: Model<SessionDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          let token = null;
          if (request && request.cookies) {
            token = request.cookies['access_token'];
          }
          return token || ExtractJwt.fromAuthHeaderAsBearerToken()(request);
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('SESSION_SECRET') as string,
    });
  }

  async validate(payload: { sub: string; email: string; sessionToken?: string }) {
    const user = await this.usersService.findById(payload.sub);
    if (!user) throw new UnauthorizedException('User not found');
    if (
      user.status === 'SUSPENDED' ||
      user.status === 'DEACTIVATED' ||
      user.status === 'PENDING_APPROVAL'
    ) {
      throw new UnauthorizedException('Account is inactive, suspended, or pending approval');
    }

    // Verify server-side session validity (invalidated on logout or password reset)
    if (payload.sessionToken) {
      const activeSession = await this.sessionModel.findOne({
        userId: user._id,
        sessionToken: payload.sessionToken,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      }).lean().exec();

      if (!activeSession) {
        throw new UnauthorizedException('Session has been revoked or expired. Please login again.');
      }
    } else {
      const anyActiveSession = await this.sessionModel.findOne({
        userId: user._id,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      }).lean().exec();

      if (!anyActiveSession) {
        throw new UnauthorizedException('Session has been revoked or expired. Please login again.');
      }
    }

    // Lookup employee profile and role
    const employee = await this.employeeModel
      .findOne({ userId: user._id })
      .populate('roleId')
      .lean()
      .exec();

    const roleDoc: any = employee?.roleId;
    const superadminEmail = this.configService.get<string>('SUPERADMIN_EMAIL');
    const isSuperAdminEmail = superadminEmail && user.email.toLowerCase() === superadminEmail.toLowerCase();

    const roleName = isSuperAdminEmail
      ? 'Super Admin'
      : roleDoc?.name || 'Employee';

    const permissions = isSuperAdminEmail
      ? ['*']
      : roleDoc?.permissions || [];

    const isSuperAdmin = roleName === 'Super Admin' || permissions.includes('*') || isSuperAdminEmail;

    return {
      _id: user._id,
      userId: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'SafeVitals User',
      status: user.status,
      mustChangePassword: user.mustChangePassword ?? false,
      employeeDocId: employee?._id ? employee._id.toString() : null,
      employeeId: employee?.employeeId || null,
      role: roleName,
      isSuperAdmin,
      permissions,
      departmentId: employee?.departmentId ? employee.departmentId.toString() : null,
      teamId: employee?.teamId ? employee.teamId.toString() : null,
    };
  }
}

