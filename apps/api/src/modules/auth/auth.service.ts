import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RegisterDto, LoginDto, UserRole } from '@matchpaw/shared';
import { AuthRepository } from './auth.repository';
import { UserDocument } from './schemas/user.schema';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 60 minutos

@Injectable()
export class AuthService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ── Registro ─────────────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException({
        error: { code: 'EMAIL_TAKEN', message: 'El correo ya está registrado' },
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.repo.createUser({
      email: dto.email,
      passwordHash,
      role: dto.role,
    });

    return this.generateTokens(user);
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.repo.findByEmail(dto.email);

    // Mensaje genérico: no revelar qué campo es incorrecto (Requisito 1.4)
    const INVALID_MSG = 'Credenciales inválidas';

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException({
        error: { code: 'INVALID_CREDENTIALS', message: INVALID_MSG },
      });
    }

    if (!user.activo) {
      throw new UnauthorizedException({
        error: { code: 'ACCOUNT_SUSPENDED', message: 'Cuenta suspendida' },
      });
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException({
        error: { code: 'INVALID_CREDENTIALS', message: INVALID_MSG },
      });
    }

    return this.generateTokens(user);
  }

  // ── Refresh token ─────────────────────────────────────────────────────────

  async refresh(refreshToken: string): Promise<AuthTokens> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException({
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'Token inválido o expirado' },
      });
    }

    const user = await this.repo.findById(payload.sub);
    if (!user || !user.activo) {
      throw new UnauthorizedException({
        error: { code: 'INVALID_REFRESH_TOKEN', message: 'Token inválido o expirado' },
      });
    }

    return this.generateTokens(user);
  }

  // ── Google OAuth ──────────────────────────────────────────────────────────

  async validateGoogleUser(
    profile: { email: string; googleId: string; displayName?: string },
    role: UserRole = 'adoptante',
  ): Promise<UserDocument> {
    // 1. Buscar por googleId
    let user = await this.repo.findByGoogleId(profile.googleId);
    if (user) return user;

    // 2. Buscar por email (cuenta existente sin googleId)
    user = await this.repo.findByEmail(profile.email);
    if (user) {
      return this.repo.linkGoogleId(user._id.toString(), profile.googleId);
    }

    // 3. Crear nuevo usuario OAuth
    return this.repo.createUser({
      email: profile.email,
      passwordHash: null,
      role,
      googleId: profile.googleId,
    });
  }

  async googleLogin(user: UserDocument): Promise<AuthTokens> {
    return this.generateTokens(user);
  }

  /** @deprecated Use validateGoogleUser + googleLogin instead */
  async loginWithGoogle(data: {
    email: string;
    googleId: string;
    role: UserRole;
  }): Promise<AuthTokens> {
    const user = await this.repo.upsertGoogleUser(data);
    return this.generateTokens(user);
  }

  // ── Forgot password ───────────────────────────────────────────────────────

  async forgotPassword(email: string): Promise<{ token: string }> {
    // Siempre responder igual para no revelar si el email existe (seguridad)
    const user = await this.repo.findByEmail(email);
    if (!user) {
      // Retornamos un token ficticio para no revelar la existencia del email
      return { token: '' };
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await this.repo.createResetToken({
      userId: user._id.toString(),
      tokenHash,
      expiresAt,
    });

    // En producción: encolar email con SendGrid. Aquí retornamos el token
    // para que el controlador lo use (en tests) o lo envíe por email.
    return { token: rawToken };
  }

  // ── Reset password ────────────────────────────────────────────────────────

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    const tokenDoc = await this.repo.findValidResetToken(tokenHash);
    if (!tokenDoc) {
      throw new UnauthorizedException({
        error: {
          code: 'INVALID_RESET_TOKEN',
          message: 'El enlace de restablecimiento es inválido o ha expirado',
        },
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    const user = await this.repo.findById(tokenDoc.userId.toString());
    if (!user) {
      throw new UnauthorizedException({
        error: { code: 'INVALID_RESET_TOKEN', message: 'Token inválido' },
      });
    }

    user.passwordHash = passwordHash;
    await user.save();
    await this.repo.markTokenUsed(tokenDoc._id.toString());
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private generateTokens(user: UserDocument): AuthTokens {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_SECRET'),
      expiresIn: this.config.get<string>('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    return { accessToken, refreshToken };
  }
}
