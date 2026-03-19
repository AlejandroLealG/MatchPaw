import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DonacionesController } from './donaciones.controller';
import { DonacionesService } from './donaciones.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

const donacionesServiceMock = {
  crearPaymentIntent: jest.fn(),
  procesarWebhook: jest.fn(),
  crearSuscripcion: jest.fn(),
  cancelarSuscripcion: jest.fn(),
  historialDonacionesByUserId: jest.fn(),
};

function makeReq(userId = 'user-id-1', role = 'adoptante') {
  return {
    user: { sub: userId, email: 'test@test.com', role },
    rawBody: Buffer.from('{}'),
  };
}

describe('DonacionesController', () => {
  let controller: DonacionesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DonacionesController],
      providers: [{ provide: DonacionesService, useValue: donacionesServiceMock }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DonacionesController>(DonacionesController);
    jest.clearAllMocks();
  });

  // ── crearDonacion ─────────────────────────────────────────────────────────

  describe('crearDonacion', () => {
    it('retorna clientSecret y donacionId', async () => {
      const result = {
        clientSecret: 'pi_secret',
        donacionId: 'don-id-1',
        numeroReferencia: 'MP-123',
      };
      donacionesServiceMock.crearPaymentIntent.mockResolvedValue(result);

      const res = await controller.crearDonacion(makeReq() as never, {
        refugioId: 'refugio-id-1',
        monto: 50000,
      });

      expect(res.clientSecret).toBe('pi_secret');
      expect(donacionesServiceMock.crearPaymentIntent).toHaveBeenCalledWith('user-id-1', {
        refugioId: 'refugio-id-1',
        monto: 50000,
      });
    });

    it('propaga NotFoundException si el refugio no existe', async () => {
      donacionesServiceMock.crearPaymentIntent.mockRejectedValue(new NotFoundException());

      await expect(
        controller.crearDonacion(makeReq() as never, {
          refugioId: 'bad-id',
          monto: 50000,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('propaga BadRequestException si el refugio no está verificado', async () => {
      donacionesServiceMock.crearPaymentIntent.mockRejectedValue(new BadRequestException());

      await expect(
        controller.crearDonacion(makeReq() as never, {
          refugioId: 'refugio-id-1',
          monto: 50000,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── webhook ───────────────────────────────────────────────────────────────

  describe('webhook', () => {
    it('retorna { received: true } para webhook válido', async () => {
      donacionesServiceMock.procesarWebhook.mockResolvedValue({
        received: true,
      });

      const result = await controller.webhook(makeReq() as never, 'stripe-sig-123');

      expect(result.received).toBe(true);
    });

    it('propaga BadRequestException para firma inválida', async () => {
      donacionesServiceMock.procesarWebhook.mockRejectedValue(new BadRequestException());

      await expect(controller.webhook(makeReq() as never, 'bad-sig')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── crearSuscripcion ──────────────────────────────────────────────────────

  describe('crearSuscripcion', () => {
    it('crea una suscripción recurrente', async () => {
      const sub = {
        _id: 'sub-id-1',
        estado: 'activa',
        montoMensual: 30000,
      };
      donacionesServiceMock.crearSuscripcion.mockResolvedValue(sub);

      const result = await controller.crearSuscripcion(makeReq() as never, {
        refugioId: 'refugio-id-1',
        montoMensual: 30000,
      });

      expect(result.estado).toBe('activa');
    });

    it('propaga NotFoundException si el refugio no existe', async () => {
      donacionesServiceMock.crearSuscripcion.mockRejectedValue(new NotFoundException());

      await expect(
        controller.crearSuscripcion(makeReq() as never, {
          refugioId: 'bad-id',
          montoMensual: 30000,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── cancelarSuscripcion ───────────────────────────────────────────────────

  describe('cancelarSuscripcion', () => {
    it('cancela la suscripción', async () => {
      const cancelled = { _id: 'sub-id-1', estado: 'cancelada' };
      donacionesServiceMock.cancelarSuscripcion.mockResolvedValue(cancelled);

      const result = await controller.cancelarSuscripcion(makeReq() as never, 'sub-id-1');

      expect(result.estado).toBe('cancelada');
    });

    it('propaga ForbiddenException si el usuario no es el donante', async () => {
      donacionesServiceMock.cancelarSuscripcion.mockRejectedValue(new ForbiddenException());

      await expect(
        controller.cancelarSuscripcion(makeReq('otro-user') as never, 'sub-id-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── historialRefugio ──────────────────────────────────────────────────────

  describe('historialRefugio', () => {
    it('retorna historial paginado del refugio', async () => {
      const paginated = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };
      donacionesServiceMock.historialDonacionesByUserId.mockResolvedValue(paginated);

      const result = await controller.historialRefugio(makeReq('refugio-user', 'refugio') as never);

      expect(result.total).toBe(0);
      expect(donacionesServiceMock.historialDonacionesByUserId).toHaveBeenCalledWith(
        'refugio-user',
        1,
        10,
      );
    });
  });
});
