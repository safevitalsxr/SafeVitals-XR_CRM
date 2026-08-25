import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth, DecodedIdToken } from 'firebase-admin/auth';

export interface FirebaseUserProfile {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  phoneNumber?: string;
  emailVerified: boolean;
  disabled: boolean;
}

@Injectable()
export class FirebaseService {
  private readonly logger = new Logger(FirebaseService.name);
  private app: App | null = null;
  private auth: Auth | null = null;
  private isInitialized = false;

  constructor(private configService: ConfigService) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKeyRaw = this.configService.get<string>('FIREBASE_PRIVATE_KEY');

    const existingApps = getApps();
    if (existingApps.length > 0) {
      this.app = existingApps[0]!;
      this.auth = getAuth(this.app);
      this.isInitialized = true;
      return;
    }

    if (projectId && clientEmail && privateKeyRaw) {
      try {
        const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
        this.app = initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
        this.auth = getAuth(this.app);
        this.isInitialized = true;
        this.logger.log(`Firebase Admin initialized successfully for project: ${projectId}`);
      } catch (err: any) {
        this.logger.error(`Failed to initialize Firebase Admin: ${err.message}`);
        throw new Error(`Firebase Admin SDK Configuration Error: ${err.message}`);
      }
    } else {
      this.logger.warn('FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY missing. Firebase operations will run in mock/simulation mode.');
    }
  }

  /**
   * Verify a Firebase ID Token sent from client frontend
   */
  async verifyIdToken(idToken: string): Promise<DecodedIdToken> {
    if (!this.isInitialized || !this.auth) {
      this.logger.warn('Firebase not configured. Simulated mock token validation used for development.');
      try {
        const decoded = JSON.parse(Buffer.from(idToken.split('.')[1] || '', 'base64').toString());
        return {
          uid: decoded.uid || decoded.sub || 'mock-firebase-uid',
          email: decoded.email || 'mock@safevitals.com',
          name: decoded.name || 'Mock User',
        } as unknown as DecodedIdToken;
      } catch {
        throw new BadRequestException('Invalid or unverified Firebase ID token');
      }
    }

    try {
      return await this.auth.verifyIdToken(idToken);
    } catch (err: any) {
      this.logger.error(`Firebase token verification failed: ${err.message}`);
      throw new BadRequestException('Invalid, expired, or revoked Firebase token');
    }
  }

  /**
   * Fetch complete user profile by Firebase UID
   */
  async getUser(uid: string): Promise<FirebaseUserProfile> {
    if (!uid || uid.trim().length === 0) {
      throw new BadRequestException('Firebase UID is required');
    }

    if (!this.isInitialized || !this.auth) {
      this.logger.warn(`Firebase not configured. Returning mock user for UID: ${uid}`);
      return {
        uid,
        email: `${uid.toLowerCase().slice(0, 8)}@safevitals.com`,
        displayName: 'Firebase User',
        emailVerified: true,
        disabled: false,
      };
    }

    try {
      const userRecord = await this.auth.getUser(uid);
      return {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        phoneNumber: userRecord.phoneNumber,
        emailVerified: userRecord.emailVerified,
        disabled: userRecord.disabled,
      };
    } catch (err: any) {
      this.logger.error(`Failed to fetch user for UID "${uid}": ${err.message}`);
      if (err.code === 'auth/user-not-found') {
        throw new NotFoundException(`Firebase user with UID "${uid}" was not found in Firebase Auth`);
      }
      throw new BadRequestException(`Firebase error: ${err.message}`);
    }
  }

  /**
   * Create a user in Firebase Auth programmatically
   */
  async createUser(data: { email: string; displayName?: string; password?: string }): Promise<FirebaseUserProfile> {
    if (!this.isInitialized || !this.auth) {
      const mockUid = `fb_${Date.now().toString(36)}`;
      return {
        uid: mockUid,
        email: data.email,
        displayName: data.displayName,
        emailVerified: false,
        disabled: false,
      };
    }

    try {
      const record = await this.auth.createUser({
        email: data.email,
        displayName: data.displayName,
        password: data.password,
      });
      return {
        uid: record.uid,
        email: record.email,
        displayName: record.displayName,
        photoURL: record.photoURL,
        phoneNumber: record.phoneNumber,
        emailVerified: record.emailVerified,
        disabled: record.disabled,
      };
    } catch (err: any) {
      this.logger.error(`Failed to create Firebase user: ${err.message}`);
      throw new BadRequestException(`Firebase user creation error: ${err.message}`);
    }
  }

  /**
   * Update a user's password in Firebase Auth programmatically
   */
  async updateUserPassword(uid: string, password: string): Promise<void> {
    if (!this.isInitialized || !this.auth) {
      this.logger.warn(`Firebase not configured. Simulated password update for UID: ${uid}`);
      return;
    }

    try {
      await this.auth.updateUser(uid, { password });
      this.logger.log(`Successfully updated Firebase password for UID: ${uid}`);
    } catch (err: any) {
      this.logger.error(`Failed to update password for Firebase user "${uid}": ${err.message}`);
      throw new BadRequestException(`Firebase password update error: ${err.message}`);
    }
  }
}
