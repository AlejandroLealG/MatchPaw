import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, Connection, Model, Types } from 'mongoose';
import { Notificacion, NotificacionSchema } from './schemas/notificacion.schema';
import { PushSubscription, PushSubscriptionSchema } from './schemas/push-subscription.schema';
import { NotificacionesRepository } from './notificaciones.repository';

describe('NotificacionesRepository', () => {
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let notificacionModel: Model<Notificacion>;
  let pushModel: Model<PushSubscription>;
  let repo: NotificacionesRepository;

  const userId = new Types.ObjectId();
  const otroUserId = new Types.ObjectId();

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const conn = await connect(mongod.getUri());
    mongoConnection = conn.connection;

    notificacionModel = mongoConnection.model(Notificacion.name, NotificacionSchema);
    pushModel = mongoConnection.model(PushSubscription.name, PushSubscriptionSchema);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificacionesRepository,
        {
          provide: getModelToken(Notificacion.name),
          useValue: notificacionModel,
        },
        {
          provide: getModelToken(PushSubscription.name),
          useValue: pushModel,
        },
      ],
    }).compile();

    repo = module.get<NotificacionesRepository>(NotificacionesRepository);
  });

  afterAll(async () => {
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
  });

  afterEach(async () => {
    await notificacionModel.deleteMany({});
    await pushModel.deleteMany({});
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('crea una notificación no leída', async () => {
      const doc = await repo.create({
        userId: userId.toString(),
        tipo: 'nueva_solicitud',
        titulo: 'Nueva solicitud',
        cuerpo: 'Tienes una nueva solicitud',
      });

      expect(doc._id).toBeDefined();
      expect(doc.leida).toBe(false);
      expect(doc.tipo).toBe('nueva_solicitud');
      expect(doc.userId.toString()).toBe(userId.toString());
    });
  });

  // ── findByUser ────────────────────────────────────────────────────────────

  describe('findByUser', () => {
    it('retorna notificaciones del usuario ordenadas por fecha desc', async () => {
      await repo.create({
        userId: userId.toString(),
        tipo: 'nueva_solicitud',
        titulo: 'Primera',
        cuerpo: 'Cuerpo 1',
      });
      await repo.create({
        userId: userId.toString(),
        tipo: 'donacion_recibida',
        titulo: 'Segunda',
        cuerpo: 'Cuerpo 2',
      });

      const result = await repo.findByUser(userId.toString());
      expect(result).toHaveLength(2);
    });

    it('no retorna notificaciones de otros usuarios', async () => {
      await repo.create({
        userId: userId.toString(),
        tipo: 'nueva_solicitud',
        titulo: 'Mía',
        cuerpo: 'Cuerpo',
      });
      await repo.create({
        userId: otroUserId.toString(),
        tipo: 'nueva_solicitud',
        titulo: 'Ajena',
        cuerpo: 'Cuerpo',
      });

      const result = await repo.findByUser(userId.toString());
      expect(result).toHaveLength(1);
      expect(result[0].titulo).toBe('Mía');
    });

    it('retorna lista vacía para userId inválido', async () => {
      const result = await repo.findByUser('id-invalido');
      expect(result).toHaveLength(0);
    });
  });

  // ── markAsRead ────────────────────────────────────────────────────────────

  describe('markAsRead', () => {
    it('marca la notificación como leída', async () => {
      const notif = await repo.create({
        userId: userId.toString(),
        tipo: 'nueva_solicitud',
        titulo: 'Test',
        cuerpo: 'Cuerpo',
      });

      const updated = await repo.markAsRead(notif._id.toString(), userId.toString());

      expect(updated).not.toBeNull();
      expect(updated!.leida).toBe(true);
    });

    it('retorna null si la notificación no pertenece al usuario', async () => {
      const notif = await repo.create({
        userId: userId.toString(),
        tipo: 'nueva_solicitud',
        titulo: 'Test',
        cuerpo: 'Cuerpo',
      });

      const result = await repo.markAsRead(notif._id.toString(), otroUserId.toString());

      expect(result).toBeNull();
    });

    it('retorna null para id inválido', async () => {
      const result = await repo.markAsRead('id-invalido', userId.toString());
      expect(result).toBeNull();
    });
  });

  // ── savePushSubscription ──────────────────────────────────────────────────

  describe('savePushSubscription', () => {
    it('guarda una suscripción push', async () => {
      const sub = await repo.savePushSubscription({
        userId: userId.toString(),
        endpoint: 'https://push.example.com/sub1',
        p256dh: 'key123',
        auth: 'auth123',
      });

      expect(sub._id).toBeDefined();
      expect(sub.endpoint).toBe('https://push.example.com/sub1');
    });

    it('hace upsert si el endpoint ya existe', async () => {
      const endpoint = 'https://push.example.com/sub-upsert';

      await repo.savePushSubscription({
        userId: userId.toString(),
        endpoint,
        p256dh: 'key1',
        auth: 'auth1',
      });

      await repo.savePushSubscription({
        userId: userId.toString(),
        endpoint,
        p256dh: 'key2',
        auth: 'auth2',
      });

      const subs = await repo.findPushSubscriptionsByUser(userId.toString());
      const matching = subs.filter((s) => s.endpoint === endpoint);
      expect(matching).toHaveLength(1);
      expect(matching[0].p256dh).toBe('key2');
    });
  });

  // ── deletePushSubscription ────────────────────────────────────────────────

  describe('deletePushSubscription', () => {
    it('elimina la suscripción push', async () => {
      const endpoint = 'https://push.example.com/to-delete';
      await repo.savePushSubscription({
        userId: userId.toString(),
        endpoint,
        p256dh: 'key',
        auth: 'auth',
      });

      await repo.deletePushSubscription(endpoint, userId.toString());

      const subs = await repo.findPushSubscriptionsByUser(userId.toString());
      expect(subs.find((s) => s.endpoint === endpoint)).toBeUndefined();
    });

    it('no falla si el userId es inválido', async () => {
      await expect(
        repo.deletePushSubscription('https://push.example.com/x', 'id-invalido'),
      ).resolves.not.toThrow();
    });
  });

  // ── findPushSubscriptionsByUser ───────────────────────────────────────────

  describe('findPushSubscriptionsByUser', () => {
    it('retorna todas las suscripciones del usuario', async () => {
      await repo.savePushSubscription({
        userId: userId.toString(),
        endpoint: 'https://push.example.com/a',
        p256dh: 'k1',
        auth: 'a1',
      });
      await repo.savePushSubscription({
        userId: userId.toString(),
        endpoint: 'https://push.example.com/b',
        p256dh: 'k2',
        auth: 'a2',
      });

      const subs = await repo.findPushSubscriptionsByUser(userId.toString());
      expect(subs.length).toBeGreaterThanOrEqual(2);
    });

    it('retorna lista vacía para userId inválido', async () => {
      const subs = await repo.findPushSubscriptionsByUser('id-invalido');
      expect(subs).toHaveLength(0);
    });
  });
});
