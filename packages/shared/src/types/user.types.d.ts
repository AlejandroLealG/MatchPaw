export type UserRole = 'adoptante' | 'refugio' | 'admin';
export interface IUser {
  _id: string;
  email: string;
  role: UserRole;
  activo: boolean;
  googleId?: string;
  createdAt: Date;
  updatedAt: Date;
}
//# sourceMappingURL=user.types.d.ts.map
