import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesService } from './notificaciones.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

const mockNotif = {
  _id: 'notif-id-1',
  userId: 'user-id-1',
  tipo: 'nueva_solicitud',
  titulo: 'Nueva solicitud',
  cuerpo: 'Tienes una nueva solicitud',
  leida: false,
};

const notificacionesServiceMock = {
  findByUser: jest.fn(),
  markAsRead: jest.fn(),
  suscribir: jest.fn(),
  desuscribir: jest.fn(),
};

function makeReq(userId = 'user-id-1') {
  return { user: { sub: userId, email: 'test@test.com', role: 'adoptante' } };
}

describe('NotificacionesController', () => {
  let controller: NotificacionesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificacionesController],
      providers: [{ provide: NotificacionesService, useValue: notificacionesServiceMock }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificacionesController>(NotificacionesController);
    jest.clearAllMocks();
  });

  // ── listar ────────────────────────────────────────────────────────────────

  describe('listar', () => {
    it('retorna notificaciones del usuario', async () => {
      notificacionesServiceMock.findByUser.mockResolvedValue([mockNotif]);

      const result = await controller.listar(makeReq() as never);

      expect(result).toHaveLength(1);
      expect(notificacionesServiceMock.findByUser).toHaveBeenCalledWith('user-id-1');
    });

    it('retorna lista vacía si no hay notificaciones', async () => {
      notificacionesServiceMock.findByUser.mockResolvedValue([]);

      const result = await controller.listar(makeReq() as never);

      expect(result).toHaveLength(0);
    });
  });

  // ── marcarLeida ───────────────────────────────────────────────────────────

  describe('marcarLeida', () => {
    it('marca la notificación como leída', async () => {
      const updated = { ...mockNotif, leida: true };
      notificacionesServiceMock.markAsRead.mockResolvedValue(updated);

      const result = await controller.marcarLeida('notif-id-1', makeReq() as never);

      expect(result.leida).toBe(true);
      expect(notificacionesServiceMock.markAsRead).toHaveBeenCalledWith('notif-id-1', 'user-id-1');
    });

    it('propaga NotFoundException si la notificación no existe', async () => {
      notificacionesServiceMock.markAsRead.mockRejectedValue(new NotFoundException());

      await expect(controller.marcarLeida('bad-id', makeReq() as never)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── suscribir ─────────────────────────────────────────────────────────────

  describe('suscribir', () => {
    it('registra la suscripción push', async () => {
      const sub = {
        endpoint: 'https://push.example.com/sub1',
        p256dh: 'key',
        auth: 'auth',
      };
      notificacionesServiceMock.suscribir.mockResolvedValue(sub);

      const result = await controller.suscribir(
        { endpoint: 'https://push.example.com/sub1', p256dh: 'key', auth: 'auth' },
        makeReq() as never,
      );

      expect(result.endpoint).toBe('https://push.example.com/sub1');
      expect(notificacionesServiceMock.suscribir).toHaveBeenCalledWith({
        userId: 'user-id-1',
        endpoint: 'https://push.example.com/sub1',
        p256dh: 'key',
        auth: 'auth',
      });
    });
  });

  // ── desuscribir ───────────────────────────────────────────────────────────

  describe('desuscribir', () => {
    it('cancela la suscripción push sin error', async () => {
      notificacionesServiceMock.desuscribir.mockResolvedValue(undefined);

      await expect(
        controller.desuscribir({ endpoint: 'https://push.example.com/sub1' }, makeReq() as never),
      ).resolves.not.toThrow();

      expect(notificacionesServiceMock.desuscribir).toHaveBeenCalledWith(
        'https://push.example.com/sub1',
        'user-id-1',
      );
    });
  });
});
