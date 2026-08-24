import { Types } from 'mongoose';

export function toObjectId(id?: string | null): Types.ObjectId | undefined {
  return id && Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : undefined;
}
