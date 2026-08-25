jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
  cert: jest.fn(),
}));
jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
    getUser: jest.fn(),
    createUser: jest.fn(),
  })),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../common/email/email.service';
import { FirebaseService } from '../common/firebase/firebase.service';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Session } from './schemas/session.schema';
import { Otp } from './schemas/otp.schema';
import { Invitation } from './schemas/invitation.schema';
import { UnauthorizedException } from '@nestjs/common';
import { Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';

describe('AuthService (Security Audit Tests)', () => {
  let service: AuthService;
  let usersService: jest.Mocked<Partial<UsersService>>;
  let auditService: jest.Mocked<Partial<AuditService>>;
  let emailService: jest.Mocked<Partial<EmailService>>;
  let firebaseService: jest.Mocked<Partial<FirebaseService>>;
  let otpModel: any;
  let sessionModel: any;
  let invitationModel: any;

  const mockUser = {
    _id: new Types.ObjectId(),
    email: 'test@safevitals.com',
    passwordHash: '$2a$12$abcdefghijklmnopqrstuvwxyz1234567890',
    status: 'ACTIVE',
    firstName: 'John',
    lastName: 'Doe',
    mustChangePassword: false,
  };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      validatePassword: jest.fn(),
      findById: jest.fn(),
      updatePassword: jest.fn(),
      updateStatus: jest.fn(),
    };

    auditService = {
      log: jest.fn().mockResolvedValue({} as any),
      findAll: jest.fn(),
    };

    emailService = {
      sendOtp: jest.fn().mockResolvedValue(true),
      sendInvitation: jest.fn().mockResolvedValue(true),
      sendPasswordReset: jest.fn().mockResolvedValue(true),
      send: jest.fn().mockResolvedValue(true),
    };

    firebaseService = {
      verifyIdToken: jest.fn().mockResolvedValue({ uid: 'test-uid', email: 'test@safevitals.com' } as any),
      getUser: jest.fn().mockResolvedValue({ uid: 'test-uid', email: 'test@safevitals.com' } as any),
      createUser: jest.fn().mockResolvedValue({ uid: 'test-uid', email: 'test@safevitals.com' } as any),
    };

    otpModel = {
      deleteMany: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findByIdAndUpdate: jest.fn().mockResolvedValue({}),
    };

    sessionModel = {
      create: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({}),
    };

    invitationModel = {
      deleteMany: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
      findOneAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: AuditService, useValue: auditService },
        { provide: EmailService, useValue: emailService },
        { provide: FirebaseService, useValue: firebaseService },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
        { provide: getModelToken(Session.name), useValue: sessionModel },
        { provide: getModelToken(Otp.name), useValue: otpModel },
        { provide: getModelToken(Invitation.name), useValue: invitationModel },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login - Security & Zero Leakage', () => {
    it('should NEVER return devOtp or plain OTP in response', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (usersService.validatePassword as jest.Mock).mockResolvedValue(true);

      const result: any = await service.login('test@safevitals.com', 'Password123!');

      expect(result.success).toBe(true);
      expect(result.userId).toBe(mockUser._id.toString());
      expect(result.message).toBe('OTP sent to registered email');
      expect(result.devOtp).toBeUndefined();
      expect(result.otp).toBeUndefined();
      expect(result.plainOtp).toBeUndefined();
    });

    it('should hash the OTP before persisting to database', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (usersService.validatePassword as jest.Mock).mockResolvedValue(true);

      await service.login('test@safevitals.com', 'Password123!');

      expect(otpModel.create).toHaveBeenCalledTimes(1);
      const createdRecord = otpModel.create.mock.calls[0][0];
      expect(createdRecord.otpHash).toBeDefined();
      expect(createdRecord.otpHash.startsWith('$2a$') || createdRecord.otpHash.startsWith('$2b$')).toBe(true);
      expect(createdRecord.otp).toBeUndefined();
    });
  });

  describe('verifyOtp - Atomic & Replay Resistance', () => {
    it('should verify correct OTP and return session token', async () => {
      const plainOtp = '654321';
      const otpHash = await bcrypt.hash(plainOtp, 12);
      const otpRecord = {
        _id: new Types.ObjectId(),
        userId: mockUser._id,
        otpHash,
        attempts: 0,
        used: false,
      };

      (usersService.findById as jest.Mock).mockResolvedValue(mockUser);
      otpModel.findOne.mockResolvedValue(otpRecord);
      otpModel.findOneAndUpdate.mockResolvedValue({ ...otpRecord, used: true });

      const result = await service.verifyOtp(mockUser._id.toString(), plainOtp);

      expect(result.success).toBe(true);
      expect(result.token).toBe('mock-jwt-token');
      expect(otpModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: otpRecord._id, used: false },
        { $set: { used: true } },
        { new: true },
      );
    });

    it('should reject invalid OTP and increment attempts', async () => {
      const otpHash = await bcrypt.hash('123456', 12);
      const otpRecord = {
        _id: new Types.ObjectId(),
        userId: mockUser._id,
        otpHash,
        attempts: 0,
        used: false,
      };

      (usersService.findById as jest.Mock).mockResolvedValue(mockUser);
      otpModel.findOne.mockResolvedValue(otpRecord);

      await expect(service.verifyOtp(mockUser._id.toString(), '999999')).rejects.toThrow(
        UnauthorizedException,
      );
      expect(otpModel.findByIdAndUpdate).toHaveBeenCalledWith(otpRecord._id, {
        $inc: { attempts: 1 },
      });
    });
  });

  describe('forgotPassword - User Enumeration Prevention', () => {
    it('should return identical response whether user exists or not', async () => {
      (usersService.findByEmail as jest.Mock).mockResolvedValue(null);
      const nonExistingResult: any = await service.forgotPassword('nonexistent@safevitals.com');

      (usersService.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      const existingResult: any = await service.forgotPassword('test@safevitals.com');

      expect(nonExistingResult.success).toBe(true);
      expect(existingResult.success).toBe(true);
      expect(nonExistingResult.message).toBe(existingResult.message);
      expect(nonExistingResult.devToken).toBeUndefined();
      expect(existingResult.devToken).toBeUndefined();
    });
  });
});
