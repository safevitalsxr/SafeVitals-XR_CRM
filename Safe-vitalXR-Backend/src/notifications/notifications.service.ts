import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { DeviceToken, DeviceTokenDocument } from './schemas/device-token.schema';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name) private model: Model<NotificationDocument>,
    @InjectModel(DeviceToken.name) private deviceTokenModel: Model<DeviceTokenDocument>,
  ) {}

  async create(data: { userId: string; type: string; title: string; message: string; link?: string }) {
    return this.model.create({ ...data, userId: new Types.ObjectId(data.userId) });
  }

  async findByUser(userId: string, page = 1, limit = 30) {
    const skip = (page - 1) * limit;
    const filter = { userId: new Types.ObjectId(userId) };
    const [data, total] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.model.countDocuments(filter),
    ]);
    return { data, total, page, limit };
  }

  async markRead(id: string, userId: string) {
    return this.model.findOneAndUpdate(
      { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) },
      { isRead: true },
      { new: true }
    ).exec();
  }

  async markAllRead(userId: string) {
    await this.model.updateMany({ userId: new Types.ObjectId(userId), isRead: false }, { isRead: true }).exec();
    return { success: true };
  }

  async countUnread(userId: string) {
    return this.model.countDocuments({ userId: new Types.ObjectId(userId), isRead: false });
  }

  async registerDeviceToken(userId: string, data: { token: string; platform?: string; deviceId?: string; appVersion?: string }) {
    return this.deviceTokenModel.findOneAndUpdate(
      { token: data.token },
      {
        userId: new Types.ObjectId(userId),
        token: data.token,
        platform: data.platform || 'unknown',
        deviceId: data.deviceId,
        appVersion: data.appVersion,
        isActive: true,
      },
      { upsert: true, new: true },
    );
  }

  async unregisterDeviceToken(userId: string, token: string) {
    await this.deviceTokenModel.findOneAndDelete({ token, userId: new Types.ObjectId(userId) });
    return { success: true, message: 'Device token unregistered' };
  }

  async findTokensByUser(userId: string) {
    return this.deviceTokenModel.find({ userId: new Types.ObjectId(userId), isActive: true }).lean();
  }
}

