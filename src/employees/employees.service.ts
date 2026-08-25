import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';
import { Employee, EmployeeDocument } from './schemas/employee.schema';
import { EmployeeCounter, EmployeeCounterDocument } from './schemas/employee-counter.schema';
import { User, UserDocument, AccountStatus } from '../users/schemas/user.schema';
import { CreateEmployeeDto, UpdateEmployeeDto, EmployeeQueryDto, OnboardEmployeeByUidDto } from './dto/employee.dto';
import { UsersService } from '../users/users.service';
import { AuthService } from '../auth/auth.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../common/email/email.service';
import { FirebaseService } from '../common/firebase/firebase.service';
import * as crypto from 'crypto';
import { toObjectId } from '../common/utils/mongo.util';

@Injectable()
export class EmployeesService {
  private readonly logger = new Logger(EmployeesService.name);

  constructor(
    @InjectModel(Employee.name) private employeeModel: Model<EmployeeDocument>,
    @InjectModel(EmployeeCounter.name) private counterModel: Model<EmployeeCounterDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private usersService: UsersService,
    private authService: AuthService,
    private auditService: AuditService,
    private emailService: EmailService,
    private firebaseService: FirebaseService,
    @InjectConnection() private connection: Connection,
  ) {}

  // Auto-generate Employee ID (EMP-000001) — atomic via findOneAndUpdate
  private async generateEmployeeId(): Promise<string> {
    const counter = await this.counterModel.findOneAndUpdate(
      { key: 'employee_id' },
      { $inc: { count: 1 } },
      { upsert: true, new: true },
    );
    const num = counter!.count.toString().padStart(6, '0');
    return `EMP-${num}`;
  }

  async create(dto: CreateEmployeeDto, actorId?: string) {
    // Check email uniqueness
    const existingUser = await this.usersService.findByEmail(dto.email);
    if (existingUser) {
      const existingEmp = await this.employeeModel.findOne({ userId: existingUser._id });
      if (existingEmp) {
        throw new ConflictException(`An employee profile for ${dto.email} already exists in the directory.`);
      }
    }
    // Create Firebase user natively (No password required yet)
    let firebaseUid: string | undefined;
    try {
      const fbUser = await this.firebaseService.createUser({
        email: dto.email,
        displayName: `${dto.firstName} ${dto.lastName}`.trim(),
      });
      firebaseUid = fbUser.uid;
    } catch (err: any) {
      this.logger.warn(`Could not create Firebase user during onboarding: ${err.message}`);
    }

    // Hash password & create User identity with forced initial password reset
    const tempPassword = dto.temporaryPassword || crypto.randomBytes(16).toString('hex');
    const passwordHash = await this.usersService.hashPassword(tempPassword);
    const user = await this.usersService.create(dto.email, passwordHash, dto.firstName, dto.lastName, true);
    
    if (firebaseUid) {
      await this.userModel.findByIdAndUpdate(user._id, { firebaseUid }).exec();
    }
    const userId = (user._id as Types.ObjectId).toString();

    // Auto-generate Employee ID
    const employeeId = await this.generateEmployeeId();

    // Build employee create payload
    const createPayload: any = {
      userId: user._id,
      employeeId,
      departmentId: toObjectId(dto.departmentId),
      teamId: toObjectId(dto.teamId),
      positionId: toObjectId(dto.positionId),
      roleId: toObjectId(dto.roleId),
      managerId: toObjectId(dto.managerId),
      joiningDate: dto.joiningDate || new Date().toISOString().split('T')[0],
    };
    if (firebaseUid) createPayload.firebaseUid = firebaseUid;
    if (dto.workScheduleId) createPayload.workScheduleId = toObjectId(dto.workScheduleId);

    const employee = new this.employeeModel(createPayload);
    try { await employee.save(); } catch(e) { if(e.code === 11000) throw new ConflictException('An employee profile is already linked to this user/email.'); throw e; }
    const empId = (employee._id as Types.ObjectId).toString();

    // Create invitation token & dispatch invite email to user
    const { token } = await this.authService.createInvitation(empId, userId, dto.email);
    await this.emailService.sendInvitation(dto.email, token, dto.firstName, undefined, undefined, employeeId);

    // Audit log
    await this.auditService.log({
      actorId,
      action: 'EMPLOYEE_CREATED',
      entityType: 'Employee',
      entityId: empId,
      after: { employeeId, email: dto.email, firebaseUid },
    });

    return {
      success: true,
      employee: await this.findById(empId),
    };
  }

  /**
   * Onboard an employee using Firebase UID (Auto-fetches profile details from Firebase)
   */
  async onboardByFirebaseUid(dto: OnboardEmployeeByUidDto, actorId?: string) {
    try {
      const fbUser = await this.firebaseService.getUser(dto.firebaseUid);
    if (!fbUser || !fbUser.email) {
      throw new ConflictException('Firebase user has no registered email address in Firebase Auth');
    }

    const normalizedEmail = fbUser.email.toLowerCase().trim();



    // Find or create local User identity
    let user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) {
      const nameParts = (fbUser.displayName || 'SafeVitals Employee').trim().split(' ');
      const firstName = nameParts[0] || 'Employee';
      const lastName = nameParts.slice(1).join(' ') || 'Member';
      const dummyPassword = crypto.randomBytes(32).toString('hex');
      const hash = await this.usersService.hashPassword(dummyPassword);

      user = await this.usersService.create(normalizedEmail, hash, firstName, lastName, false);
      // Note: usersService.create does not take a session parameter currently, but we'll accept it as is since it's a separate collection.
    }

    // Link firebaseUid to user document and activate
    await this.userModel.findByIdAndUpdate(user._id, {
      firebaseUid: dto.firebaseUid,
      status: AccountStatus.ACTIVE,
      isEmailVerified: fbUser.emailVerified ?? true,
    }).exec();

    // Generate sequential Employee ID (EMP-XXXXXX)
    const employeeId = await this.generateEmployeeId();

    // Update or Create Employee record in MongoDB
    const updatePayload: any = {
      firebaseUid: dto.firebaseUid,
      departmentId: toObjectId(dto.departmentId),
      teamId: toObjectId(dto.teamId),
      positionId: toObjectId(dto.positionId),
      roleId: toObjectId(dto.roleId),
      managerId: toObjectId(dto.managerId),
    };
    if (dto.workScheduleId) updatePayload.workScheduleId = toObjectId(dto.workScheduleId);

    // If joiningDate is explicitly provided, update it
    if (dto.joiningDate) updatePayload.joiningDate = dto.joiningDate;

    // Check if employee already exists by userId
    let employee = await this.employeeModel.findOne({ userId: user._id });
    if (employee) {
      // Update existing
      employee = await this.employeeModel.findByIdAndUpdate(employee._id, updatePayload, { new: true });
    } else {
      // Create new
      updatePayload.userId = user._id;
      updatePayload.employeeId = employeeId;
      updatePayload.joiningDate = dto.joiningDate || new Date().toISOString().split('T')[0];
      employee = new this.employeeModel(updatePayload);
      try { await employee.save(); } catch(e: any) { if(e.code === 11000) throw new ConflictException('An employee profile is already linked to this user/email.'); throw e; }
    }
    
    const empId = (employee!._id as Types.ObjectId).toString();

    // Audit log
    await this.auditService.log({
      actorId,
      action: 'EMPLOYEE_ONBOARDED_FIREBASE_UID',
      entityType: 'Employee',
      entityId: empId,
      after: { employeeId, firebaseUid: dto.firebaseUid, email: normalizedEmail },
    });

    // Send access granted email
    try {
      let roleName = 'Employee';
      if (updatePayload.roleId) {
        // We'd need RoleModel to fetch the real name, but we'll default to Employee for now
        // since we just want to send the notification
      }
      await this.emailService.sendWorkspaceAccessGranted(normalizedEmail, user.firstName, roleName);
    } catch (err: any) {
      this.logger.warn(`Could not send workspace access email to ${normalizedEmail}: ${err.message}`);
    }

    return {
      success: true,
      message: 'Employee successfully onboarded and linked to Firebase UID',
      employee: await this.findById(empId),
    };
    } catch (err: any) {
      this.logger.error(`FATAL ERROR in onboardByFirebaseUid: ${err.message}`, err.stack);
      throw err;
    }
  }

  async findAll(query: EmployeeQueryDto) {
    const rawPage = parseInt(query.page || '1', 10);
    const rawLimit = parseInt(query.limit || '20', 10);
    const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const limit = isNaN(rawLimit) || rawLimit < 1 ? 20 : Math.min(rawLimit, 100);
    const skip = (page - 1) * limit;

    const matchFilter: any = {};
    if (query.departmentId && Types.ObjectId.isValid(query.departmentId)) {
      matchFilter.departmentId = new Types.ObjectId(query.departmentId);
    }
    if (query.teamId && Types.ObjectId.isValid(query.teamId)) {
      matchFilter.teamId = new Types.ObjectId(query.teamId);
    }

    const pipeline: any[] = [
      { $match: matchFilter },
      { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'userId' } },
      { $unwind: { path: '$userId', preserveNullAndEmptyArrays: true } },
      { $addFields: { user: '$userId' } },
      { $lookup: { from: 'roles', localField: 'roleId', foreignField: '_id', as: 'roleId' } },
      { $unwind: { path: '$roleId', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'departments', localField: 'departmentId', foreignField: '_id', as: 'departmentId' } },
      { $unwind: { path: '$departmentId', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'teams', localField: 'teamId', foreignField: '_id', as: 'teamId' } },
      { $unwind: { path: '$teamId', preserveNullAndEmptyArrays: true } },
      { $lookup: { from: 'positions', localField: 'positionId', foreignField: '_id', as: 'positionId' } },
      { $unwind: { path: '$positionId', preserveNullAndEmptyArrays: true } },
    ];

    if (query.status) pipeline.push({ $match: { 'user.status': query.status } });
    if (query.search && query.search.trim()) {
      const sanitized = query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(sanitized, 'i');
      pipeline.push({
        $match: {
          $or: [
            { 'user.firstName': re },
            { 'user.lastName': re },
            { 'user.email': re },
            { employeeId: re },
          ],
        },
      });
    }

    pipeline.push(
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }, { $addFields: { id: '$_id', 'user.id': '$user._id' } }, { $project: { 'user.passwordHash': 0 } }],
          total: [{ $count: 'count' }],
        },
      },
    );

    const result = await this.employeeModel.aggregate(pipeline);
    return {
      data: result[0]?.data || [],
      total: result[0]?.total[0]?.count || 0,
      page,
      limit,
    };
  }

  async findById(id: string) {
    const employee = await this.employeeModel
      .findById(id)
      .populate('userId', '-passwordHash')
      .populate('departmentId')
      .populate('teamId')
      .populate('positionId')
      .populate('roleId')
      .populate('managerId')
      .lean()
      .exec();
    if (!employee) throw new NotFoundException('Employee not found');
    return employee;
  }

  async findByUserId(userId: string) {
    const employee = await this.employeeModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .populate('userId', '-passwordHash')
      .populate('departmentId')
      .populate('teamId')
      .populate('positionId')
      .populate('roleId')
      .lean()
      .exec();
    if (!employee) throw new NotFoundException('Employee profile not found');
    return employee;
  }

  async update(id: string, dto: UpdateEmployeeDto, actorId?: string) {
    const before = await this.findById(id);
    const updateData: any = { ...dto };
    if (dto.departmentId) updateData.departmentId = new Types.ObjectId(dto.departmentId);
    if (dto.teamId) updateData.teamId = new Types.ObjectId(dto.teamId);
    if (dto.positionId) updateData.positionId = new Types.ObjectId(dto.positionId);
    if (dto.roleId) updateData.roleId = new Types.ObjectId(dto.roleId);
    if (dto.managerId) updateData.managerId = new Types.ObjectId(dto.managerId);

    const employee = await this.employeeModel.findById(id).exec();
    if (!employee) throw new NotFoundException('Employee not found');

    if (dto.firstName || dto.lastName) {
      await this.userModel.findByIdAndUpdate(employee.userId, {
        ...(dto.firstName && { firstName: dto.firstName }),
        ...(dto.lastName && { lastName: dto.lastName }),
      }).exec();
      delete updateData.firstName;
      delete updateData.lastName;
    }

    await this.employeeModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
    await this.auditService.log({ actorId, action: 'EMPLOYEE_UPDATED', entityType: 'Employee', entityId: id, before, after: dto });
    return this.findById(id);
  }

  async suspend(id: string, actorId?: string) {
    const emp = await this.employeeModel.findById(id).exec();
    if (!emp) throw new NotFoundException('Employee not found');
    await this.usersService.updateStatus(emp.userId.toString(), AccountStatus.SUSPENDED);
    await this.auditService.log({ actorId, action: 'EMPLOYEE_SUSPENDED', entityType: 'Employee', entityId: id });
    return { success: true, message: 'Employee suspended' };
  }

  async deactivate(id: string, actorId?: string) {
    const emp = await this.employeeModel.findById(id).exec();
    if (!emp) throw new NotFoundException('Employee not found');
    await this.usersService.updateStatus(emp.userId.toString(), AccountStatus.DEACTIVATED);
    await this.auditService.log({ actorId, action: 'EMPLOYEE_DEACTIVATED', entityType: 'Employee', entityId: id });
    return { success: true, message: 'Employee deactivated' };
  }

  async reactivate(id: string, actorId?: string) {
    const emp = await this.employeeModel.findById(id).exec();
    if (!emp) throw new NotFoundException('Employee not found');
    await this.usersService.updateStatus(emp.userId.toString(), AccountStatus.ACTIVE);
    await this.auditService.log({ actorId, action: 'EMPLOYEE_REACTIVATED', entityType: 'Employee', entityId: id });
    return { success: true, message: 'Employee reactivated' };
  }

  async getDashboardStats() {
    const [totalEmployees, byStatus] = await Promise.all([
      this.employeeModel.countDocuments(),
      this.userModel.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);
    const statusMap = byStatus.reduce((acc: any, cur: any) => { acc[cur._id] = cur.count; return acc; }, {});
    return {
      totalEmployees,
      activeEmployees: statusMap['ACTIVE'] || 0,
      suspendedEmployees: statusMap['SUSPENDED'] || 0,
      invitedEmployees: statusMap['INVITED'] || 0,
    };
  }
}




