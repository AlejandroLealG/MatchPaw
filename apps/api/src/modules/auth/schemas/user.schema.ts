import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { UserRole } from '@matchpaw/shared';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ type: String, default: null })
  passwordHash!: string | null;

  @Prop({ required: true, enum: ['adoptante', 'refugio', 'admin'] })
  role!: UserRole;

  @Prop({ type: String, default: null })
  googleId!: string | null;

  @Prop({ default: true })
  activo!: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Índice único en googleId (solo cuando no es null)
UserSchema.index({ googleId: 1 }, { unique: true, sparse: true });
