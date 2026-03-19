import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UserRole } from '@matchpaw/shared';
import { User, UserDocument } from './schemas/user.schema';
import {
  PasswordResetToken,
  PasswordResetTokenDocument,
} from './schemas/password-reset-token.schema';

@Injectable()
export class AuthRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(PasswordResetToken.name)
    private readonly tokenModel: Model<PasswordResetTokenDocument>,
  ) {}

  async createUser(data: {
    email: string;
    passwordHash: string | null;
    role: UserRole;
    googleId?: string;
  }): Promise<UserDocument> {
    const user = new this.userModel({
      email: data.email,
      passwordHash: data.passwordHash ?? null,
      role: data.role,
      googleId: data.googleId ?? null,
    });
    return user.save();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase().trim() }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.userModel.findById(id).exec();
  }

  async findByGoogleId(googleId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ googleId }).exec();
  }

  async linkGoogleId(userId: string, googleId: string): Promise<UserDocument> {
    return this.userModel
      .findByIdAndUpdate(userId, { googleId }, { new: true })
      .exec() as Promise<UserDocument>;
  }

  async upsertGoogleUser(data: {
    email: string;
    googleId: string;
    role: UserRole;
  }): Promise<UserDocument> {
    return this.userModel
      .findOneAndUpdate(
        { googleId: data.googleId },
        {
          $setOnInsert: {
            email: data.email,
            passwordHash: null,
            role: data.role,
            activo: true,
          },
        },
        { upsert: true, new: true },
      )
      .exec() as Promise<UserDocument>;
  }

  // ── Password reset tokens ──────────────────────────────────────────────

  async createResetToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<PasswordResetTokenDocument> {
    const token = new this.tokenModel({
      userId: new Types.ObjectId(data.userId),
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
    });
    return token.save();
  }

  async findValidResetToken(tokenHash: string): Promise<PasswordResetTokenDocument | null> {
    return this.tokenModel
      .findOne({
        tokenHash,
        usado: false,
        expiresAt: { $gt: new Date() },
      })
      .exec();
  }

  async markTokenUsed(tokenId: string): Promise<void> {
    await this.tokenModel.findByIdAndUpdate(tokenId, { usado: true }).exec();
  }
}
