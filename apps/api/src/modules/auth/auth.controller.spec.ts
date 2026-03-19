import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

const mockTokens = { accessToken: 'access-token', refreshToken: 'refresh-token' };

const authServiceMock = {
  register: jest.fn(),
  login: jest.fn(),
  refresh: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
  googleLogin: jest.fn(),
};

function makeRes() {
  const cookieFn = jest.fn();
  return { cookie: cookieFn, _cookie: cookieFn };
}

function makeReq(overrides: Record<string, unknown> = {}) {
  return { cookies: {}, user: null, ...overrides };
}

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  // ── register ──────────────────────────────────────────────────────────────

  describe('register', () => {
    it('retorna accessToken y establece cookie', async () => {
      authServiceMock.register.mockResolvedValue(mockTokens);
      const res = makeRes();

      const result = await controller.register(
        { email: 'a@b.com', password: 'Pass123!', role: 'adoptante' },
        res as never,
      );

      expect(result.accessToken).toBe('access-token');
      expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'refresh-token', expect.any(Object));
    });

    it('propaga ConflictException del servicio', async () => {
      authServiceMock.register.mockRejectedValue(new ConflictException());
      const res = makeRes();

      await expect(
        controller.register(
          { email: 'dup@b.com', password: 'Pass123!', role: 'adoptante' },
          res as never,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── login ─────────────────────────────────────────────────────────────────

  describe('login', () => {
    it('retorna accessToken y establece cookie', async () => {
      authServiceMock.login.mockResolvedValue(mockTokens);
      const res = makeRes();

      const result = await controller.login(
        { email: 'a@b.com', password: 'Pass123!' },
        res as never,
      );

      expect(result.accessToken).toBe('access-token');
      expect(res.cookie).toHaveBeenCalledWith('refresh_token', 'refresh-token', expect.any(Object));
    });

    it('propaga UnauthorizedException del servicio', async () => {
      authServiceMock.login.mockRejectedValue(new UnauthorizedException());
      const res = makeRes();

      await expect(
        controller.login({ email: 'a@b.com', password: 'wrong' }, res as never),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── refresh ───────────────────────────────────────────────────────────────

  describe('refresh', () => {
    it('retorna accessToken usando cookie', async () => {
      authServiceMock.refresh.mockResolvedValue(mockTokens);
      const res = makeRes();
      const req = makeReq({ cookies: { refresh_token: 'old-refresh' } });

      const result = await controller.refresh(req as never, res as never);

      expect(result.accessToken).toBe('access-token');
      expect(authServiceMock.refresh).toHaveBeenCalledWith('old-refresh');
    });

    it('llama refresh con string vacío si no hay cookie', async () => {
      authServiceMock.refresh.mockResolvedValue(mockTokens);
      const res = makeRes();
      const req = makeReq({ cookies: {} });

      await controller.refresh(req as never, res as never);

      expect(authServiceMock.refresh).toHaveBeenCalledWith('');
    });
  });

  // ── forgotPassword ────────────────────────────────────────────────────────

  describe('forgotPassword', () => {
    it('retorna mensaje genérico independientemente del email', async () => {
      authServiceMock.forgotPassword.mockResolvedValue({ token: '' });

      const result = await controller.forgotPassword({
        email: 'cualquiera@example.com',
      });

      expect(result.message).toContain('Si el correo');
    });
  });

  // ── resetPassword ─────────────────────────────────────────────────────────

  describe('resetPassword', () => {
    it('retorna mensaje de éxito', async () => {
      authServiceMock.resetPassword.mockResolvedValue(undefined);

      const result = await controller.resetPassword({
        token: 'valid-token',
        password: 'NewPass456!',
      });

      expect(result.message).toContain('Contraseña actualizada');
    });

    it('propaga UnauthorizedException del servicio', async () => {
      authServiceMock.resetPassword.mockRejectedValue(new UnauthorizedException());

      await expect(controller.resetPassword({ token: 'bad', password: 'x' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
