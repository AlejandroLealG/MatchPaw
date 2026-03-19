import { UserRole } from '../types/user.types';
export interface RegisterDto {
  email: string;
  password: string;
  role: UserRole;
}
export interface LoginDto {
  email: string;
  password: string;
}
//# sourceMappingURL=auth.dto.d.ts.map
