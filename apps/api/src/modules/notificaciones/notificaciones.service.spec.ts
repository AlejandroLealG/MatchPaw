// Mock web-push BEFORE any imports that load it.
// jest.mock is hoisted automatically, so the factory runs before module load.
jest.mock('web-push', () => ({
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));

import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, Connection, Model, Types } from 'mongoose';
import { Notificacion, NotificacionSchema } from './schemas/notificacion.schema';
import { PushSubscription, PushSubscriptionSchema } from './schemas/push-subscription.schema';
import { NotificacionesRepository } from './notificaciones.repository';
import { NotificacionesService } from './notificaciones.service';
import * as webpush from 'web-push';

// Access the mocked module after jest.mock has been set up
const webpushMock = webpush as jest.Mocked<typeof webpush>;

describe('NotificacionesService', () => {
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let notificacionModel: Model<Notificacion>;
  let pushModel: Model<PushSubscription>;
  let service: NotificacionesService;

  const userId = new Types.ObjectId();

  const configServiceMock = {
    get: jest.fn((key: string, fallback?: string) => {
      // Return non-empty VAPID keys so setVapidDetails is called
      const map: Record<string, string> = {
        VAPID_PUBLIC_KEY:
          'BFakePublicKeyForTestingOnly_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        VAPID_PRIVATE_KEY: 'fake_private_key_for_testing_only_aaaaaaaaaaaaaaaaaaa',
        VAPID_SUBJECT: 'mailto:admin@matchpaw.co',
      };
      return map[key] ?? fallback ?? '';
    }),
  };

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const conn = await connect(mongod.getUri());
    mongoConnection = conn.connection;

    notificacionModel = mongoConnection.model(Notificacion.name, NotificacionSchema);
    pushModel = mongoConnection.model(PushSubscription.name, PushSubscriptionSchema);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificacionesRepository,
        NotificacionesService,
        {
          provide: getModelToken(Notificacion.name),
          useValue: notificacionModel,
        },
        {
          provide: getModelToken(PushSubscription.name),
          useValue: pushModel,
        },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get<NotificacionesService>(NotificacionesService);
  });

  afterAll(async () => {
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
  });

  afterEach(async () => {
    await notificacionModel.deleteMany({});
    await pushModel.deleteMany({});
    webpushMock.sendNotification.mockReset();
  });

  // ── crear ─────────────────────────────────────────────────────────────────

  describe('crear', () => {
    it('crea una notificación en DB', async () => {
      webpushMock.sendNotification.mockResolvedValue(undefined);

      const notif = await service.crear({
        userId: userId.toString(),
        tipo: 'nueva_solicitud',
        titulo: 'Nueva solicitud',
        cuerpo: 'Tienes una nueva solicitud de adopción',
      });

      expect(notif._id).toBeDefined();
      expect(notif.leida).toBe(false);
      expect(notif.tipo).toBe('nueva_solicitud');
    });
  });

  // ── findByUser ────────────────────────────────────────────────────────────

  describe('findByUser', () => {
    it('retorna notificaciones del usuario', async () => {
      webpushMock.sendNotification.mockResolvedValue(undefined);

      await service.crear({
        userId: userId.toString(),
        tipo: 'donacion_recibida',
        titulo: 'Donación',
        cuerpo: 'Recibiste una donación',
      });

      const result = await service.findByUser(userId.toString());
      expect(result).toHaveLength(1);
    });

    it('retorna lista vacía si no hay notificaciones', async () => {
      const result = await service.findByUser(new Types.ObjectId().toString());
      expect(result).toHaveLength(0);
    });
  });

  // ── markAsRead ────────────────────────────────────────────────────────────

  describe('markAsRead', () => {
    it('marca la notificación como leída', async () => {
      webpushMock.sendNotification.mockResolvedValue(undefined);

      const notif = await service.crear({
        userId: userId.toString(),
        tipo: 'cambio_estado_solicitud',
        titulo: 'Estado actualizado',
        cuerpo: 'Tu solicitud fue aprobada',
      });

      const updated = await service.markAsRead(notif._id.toString(), userId.toString());

      expect(updated.leida).toBe(true);
    });

    it('lanza NotFoundException si la notificación no existe o no pertenece al usuario', async () => {
      await expect(
        service.markAsRead(new Types.ObjectId().toString(), userId.toString()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── suscribir / desuscribir ───────────────────────────────────────────────

  describe('suscribir', () => {
    it('guarda la suscripción push', async () => {
      const sub = await service.suscribir({
        userId: userId.toString(),
        endpoint: 'https://push.example.com/test',
        p256dh: 'key123',
        auth: 'auth123',
      });

      expect(sub.endpoint).toBe('https://push.example.com/test');
    });
  });

  describe('desuscribir', () => {
    it('elimina la suscripción push sin lanzar error', async () => {
      const endpoint = 'https://push.example.com/unsub';
      await service.suscribir({
        userId: userId.toString(),
        endpoint,
        p256dh: 'key',
        auth: 'auth',
      });

      await expect(service.desuscribir(endpoint, userId.toString())).resolves.not.toThrow();
    });
  });

  // ── crearParaTipo ─────────────────────────────────────────────────────────

  describe('crearParaTipo', () => {
    it('crea notificación para el tipo dado', async () => {
      webpushMock.sendNotification.mockResolvedValue(undefined);

      await service.crearParaTipo(
        userId.toString(),
        'animal_adoptado',
        'Animal adoptado',
        'Tu animal fue adoptado',
      );

      const notifs = await service.findByUser(userId.toString());
      expect(notifs).toHaveLength(1);
      expect(notifs[0].tipo).toBe('animal_adoptado');
    });
  });

  // ── enviarPush ────────────────────────────────────────────────────────────

  describe('enviarPush', () => {
    it('no llama sendNotification si el usuario no tiene suscripciones', async () => {
      await service.enviarPush(new Types.ObjectId().toString(), 'Título', 'Cuerpo');

      expect(webpushMock.sendNotification).not.toHaveBeenCalled();
    });

    it('llama sendNotification para cada suscripción del usuario', async () => {
      webpushMock.sendNotification.mockResolvedValue(undefined);

      await service.suscribir({
        userId: userId.toString(),
        endpoint: 'https://push.example.com/push-test',
        p256dh: 'key123',
        auth: 'auth123',
      });

      await service.enviarPush(userId.toString(), 'Título', 'Cuerpo');

      expect(webpushMock.sendNotification).toHaveBeenCalledTimes(1);
      expect(webpushMock.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'https://push.example.com/push-test',
        }),
        expect.stringContaining('Título'),
      );
    });

    it('elimina suscripción expirada (statusCode 410)', async () => {
      const expiredError = Object.assign(new Error('Gone'), { statusCode: 410 });
      webpushMock.sendNotification.mockRejectedValue(expiredError);

      await service.suscribir({
        userId: userId.toString(),
        endpoint: 'https://push.example.com/expired',
        p256dh: 'key',
        auth: 'auth',
      });

      // Promise.allSettled handles rejections — should not throw
      await expect(
        service.enviarPush(userId.toString(), 'Título', 'Cuerpo'),
      ).resolves.not.toThrow();

      // Subscription should be deleted
      const subs = await service['repo'].findPushSubscriptionsByUser(userId.toString());
      expect(subs.find((s) => s.endpoint === 'https://push.example.com/expired')).toBeUndefined();
    });

    it('no elimina suscripción para errores distintos de 410', async () => {
      const otherError = Object.assign(new Error('Server Error'), {
        statusCode: 500,
      });
      webpushMock.sendNotification.mockRejectedValue(otherError);

      await service.suscribir({
        userId: userId.toString(),
        endpoint: 'https://push.example.com/server-error',
        p256dh: 'key',
        auth: 'auth',
      });

      await expect(
        service.enviarPush(userId.toString(), 'Título', 'Cuerpo'),
      ).resolves.not.toThrow();

      // Subscription should still exist
      const subs = await service['repo'].findPushSubscriptionsByUser(userId.toString());
      expect(
        subs.find((s) => s.endpoint === 'https://push.example.com/server-error'),
      ).toBeDefined();
    });
  });
});
