import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, Connection, Model } from 'mongoose';
import { User, UserSchema } from './schemas/user.schema';
import {
  PasswordResetToken,
  PasswordResetTokenSchema,
} from './schemas/password-reset-token.schema';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let userModel: Model<User>;
  let tokenModel: Model<PasswordResetToken>;
  let service: AuthService;

  const jwtServiceMock = {
    sign: jest.fn().mockReturnValue('signed-token'),
    verify: jest.fn(),
  };

  const configServiceMock = {
    get: jest.fn((key: string, fallback?: string) => {
      const map: Record<string, string> = {
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_IN: '7d',
      };
      return map[key] ?? fallback ?? '';
    }),
  };

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const conn = await connect(mongod.getUri());
    mongoConnection = conn.connection;

    userModel = mongoConnection.model(User.name, UserSchema);
    tokenModel = mongoConnection.model(PasswordResetToken.name, PasswordResetTokenSchema);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthRepository,
        AuthService,
        { provide: getModelToken(User.name), useValue: userModel },
        { provide: getModelToken(PasswordResetToken.name), useValue: tokenModel },
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterAll(async () => {
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
  });

  afterEach(async () => {
    await userModel.deleteMany({});
    await tokenModel.deleteMany({});
    jest.clearAllMocks();
    jwtServiceMock.sign.mockReturnValue('signed-token');
  });

  // ── register ──────────────────────────────────────────────────────────────

  describe('register', () => {
    it('registra un usuario y retorna tokens', async () => {
      const result = await service.register({
        email: 'test@example.com',
        password: 'Password123!',
        role: 'adoptante',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(jwtServiceMock.sign).toHaveBeenCalledTimes(2);
    });

    it('lanza ConflictException si el email ya existe', async () => {
      await service.register({
        email: 'dup@example.com',
        password: 'Password123!',
        role: 'adoptante',
      });

      await expect(
        service.register({
          email: 'dup@example.com',
          password: 'OtherPass123!',
          role: 'adoptante',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('hashea la contraseña (no guarda en texto plano)', async () => {
      await service.register({
        email: 'hash@example.com',
        password: 'PlainPassword',
        role: 'adoptante',
      });

      const user = await userModel.findOne({ email: 'hash@example.com' });
      expect(user!.passwordHash).not.toBe('PlainPassword');
      expect(user!.passwordHash).toMatch(/^\$2b\$/);
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    beforeEach(async () => {
      await service.register({
        email: 'login@example.com',
        password: 'Correct123!',
        role: 'adoptante',
      });
    });

    it('retorna tokens con credenciales válidas', async () => {
      const result = await service.login({
        email: 'login@example.com',
        password: 'Correct123!',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('lanza UnauthorizedException con contraseña incorrecta', async () => {
      await expect(
        service.login({ email: 'login@example.com', password: 'Wrong!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException con email inexistente', async () => {
      await expect(
        service.login({ email: 'noexiste@example.com', password: 'Any123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('el mensaje de error es genérico — Requisito 1.4', async () => {
      let code1 = '';
      let code2 = '';

      try {
        await service.login({ email: 'noexiste@example.com', password: 'Any' });
      } catch (e: unknown) {
        code1 = JSON.stringify((e as UnauthorizedException).getResponse());
      }

      try {
        await service.login({ email: 'login@example.com', password: 'Wrong' });
      } catch (e: unknown) {
        code2 = JSON.stringify((e as UnauthorizedException).getResponse());
      }

      expect(code1).toContain('INVALID_CREDENTIALS');
      expect(code2).toContain('INVALID_CREDENTIALS');
    });

    it('lanza UnauthorizedException si la cuenta está suspendida', async () => {
      await userModel.updateOne({ email: 'login@example.com' }, { $set: { activo: false } });

      await expect(
        service.login({ email: 'login@example.com', password: 'Correct123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── refresh ───────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('retorna nuevos tokens con refresh token válido', async () => {
      const user = await userModel.create({
        email: 'refresh@example.com',
        passwordHash: 'hash',
        role: 'adoptante',
      });

      jwtServiceMock.verify.mockReturnValue({
        sub: user._id.toString(),
        email: 'refresh@example.com',
        role: 'adoptante',
      });

      const result = await service.refresh('valid-refresh-token');
      expect(result.accessToken).toBeDefined();
    });

    it('lanza UnauthorizedException con token inválido', async () => {
      jwtServiceMock.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(service.refresh('bad-token')).rejects.toThrow(UnauthorizedException);
    });

    it('lanza UnauthorizedException si el usuario no existe', async () => {
      jwtServiceMock.verify.mockReturnValue({
        sub: '000000000000000000000000',
        email: 'ghost@example.com',
        role: 'adoptante',
      });

      await expect(service.refresh('token')).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── forgotPassword ────────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('retorna token para email existente', async () => {
      await service.register({
        email: 'forgot@example.com',
        password: 'Pass123!',
        role: 'adoptante',
      });

      const result = await service.forgotPassword('forgot@example.com');
      expect(result.token).toBeTruthy();
      expect(result.token.length).toBeGreaterThan(0);
    });

    it('retorna token vacío para email inexistente (no revela existencia)', async () => {
      const result = await service.forgotPassword('noexiste@example.com');
      expect(result.token).toBe('');
    });
  });

  // ── resetPassword ─────────────────────────────────────────────────────────

  describe('resetPassword', () => {
    it('cambia la contraseña con token válido', async () => {
      await service.register({
        email: 'reset@example.com',
        password: 'OldPass123!',
        role: 'adoptante',
      });

      const { token } = await service.forgotPassword('reset@example.com');
      await service.resetPassword(token, 'NewPass456!');

      const result = await service.login({
        email: 'reset@example.com',
        password: 'NewPass456!',
      });
      expect(result.accessToken).toBeDefined();
    });

    it('lanza UnauthorizedException con token inválido', async () => {
      await expect(service.resetPassword('token-invalido', 'NewPass456!')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('lanza UnauthorizedException si el token ya fue usado', async () => {
      await service.register({
        email: 'used@example.com',
        password: 'OldPass123!',
        role: 'adoptante',
      });

      const { token } = await service.forgotPassword('used@example.com');
      await service.resetPassword(token, 'NewPass456!');

      await expect(service.resetPassword(token, 'AnotherPass789!')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ── validateGoogleUser ────────────────────────────────────────────────────

  describe('validateGoogleUser', () => {
    it('crea un nuevo usuario OAuth si no existe', async () => {
      const user = await service.validateGoogleUser({
        email: 'google@example.com',
        googleId: 'google-id-123',
        displayName: 'Google User',
      });

      expect(user.email).toBe('google@example.com');
      expect(user.googleId).toBe('google-id-123');
    });

    it('retorna usuario existente por googleId', async () => {
      await service.validateGoogleUser({
        email: 'google2@example.com',
        googleId: 'google-id-456',
      });

      const user = await service.validateGoogleUser({
        email: 'google2@example.com',
        googleId: 'google-id-456',
      });

      expect(user.googleId).toBe('google-id-456');
    });

    it('vincula googleId a cuenta existente por email', async () => {
      await service.register({
        email: 'existing@example.com',
        password: 'Pass123!',
        role: 'adoptante',
      });

      const user = await service.validateGoogleUser({
        email: 'existing@example.com',
        googleId: 'new-google-id',
      });

      expect(user.googleId).toBe('new-google-id');
    });
  });
});
