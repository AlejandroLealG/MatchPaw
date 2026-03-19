// Mock Stripe BEFORE any imports — jest.mock is hoisted automatically.
// The factory must be self-contained (no external variable references).
jest.mock('stripe', () => {
  const mockInstance = {
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret',
      }),
    },
    webhooks: { constructEvent: jest.fn() },
    customers: { create: jest.fn().mockResolvedValue({ id: 'cus_test_123' }) },
    prices: { create: jest.fn().mockResolvedValue({ id: 'price_test_123' }) },
    subscriptions: {
      create: jest.fn().mockResolvedValue({ id: 'sub_test_123' }),
      cancel: jest.fn().mockResolvedValue({}),
    },
  };
  const ctor = jest.fn().mockImplementation(() => mockInstance);
  // Expose instance so tests can access it via jest.requireMock
  (ctor as jest.Mock & { _instance: typeof mockInstance })._instance = mockInstance;
  return { __esModule: true, default: ctor };
});

import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { getQueueToken } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, Connection, Model, Schema, Types } from 'mongoose';
import { Donacion, DonacionSchema } from './schemas/donacion.schema';
import {
  SuscripcionDonacion,
  SuscripcionDonacionSchema,
} from './schemas/suscripcion-donacion.schema';
import { Notificacion, NotificacionSchema } from '../notificaciones/schemas/notificacion.schema';
import { DonacionesRepository } from './donaciones.repository';
import { DonacionesService } from './donaciones.service';

// Minimal schemas for cross-module refs
const RefugioMinSchema = new Schema({
  userId: { type: Types.ObjectId },
  nombre: String,
  estado: { type: String, default: 'pendiente_verificacion' },
});
const UserMinSchema = new Schema({
  email: String,
  stripeCustomerId: { type: String, default: null },
});

// Access the mock instance created in the factory above
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StripeMock = jest.requireMock('stripe').default as jest.Mock & { _instance: any };
const stripeMock = StripeMock._instance;

describe('DonacionesService', () => {
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let donacionModel: Model<Donacion>;
  let suscripcionModel: Model<SuscripcionDonacion>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let refugioModel: Model<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let userModel: Model<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let notificacionModel: Model<any>;
  let service: DonacionesService;

  const emailQueueMock = { add: jest.fn().mockResolvedValue(undefined) };

  const configServiceMock = {
    get: jest.fn((key: string, fallback = '') => {
      const map: Record<string, string> = {
        STRIPE_SECRET_KEY: 'sk_test_fake',
        STRIPE_WEBHOOK_SECRET: 'whsec_fake',
      };
      return map[key] ?? fallback;
    }),
  };

  async function crearRefugioVerificado() {
    return refugioModel.create({
      userId: new Types.ObjectId(),
      nombre: 'Refugio Test',
      estado: 'verificado',
    });
  }

  async function crearUsuario() {
    return userModel.create({ email: `user-${Date.now()}@test.com` });
  }

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const conn = await connect(mongod.getUri());
    mongoConnection = conn.connection;

    donacionModel = mongoConnection.model(Donacion.name, DonacionSchema);
    suscripcionModel = mongoConnection.model(SuscripcionDonacion.name, SuscripcionDonacionSchema);
    refugioModel = mongoConnection.model('Refugio', RefugioMinSchema);
    userModel = mongoConnection.model('User', UserMinSchema);
    notificacionModel = mongoConnection.model(Notificacion.name, NotificacionSchema);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DonacionesRepository,
        DonacionesService,
        { provide: getModelToken(Donacion.name), useValue: donacionModel },
        { provide: getModelToken(SuscripcionDonacion.name), useValue: suscripcionModel },
        { provide: getModelToken('Refugio'), useValue: refugioModel },
        { provide: getModelToken('User'), useValue: userModel },
        { provide: getModelToken(Notificacion.name), useValue: notificacionModel },
        { provide: getQueueToken('email'), useValue: emailQueueMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get<DonacionesService>(DonacionesService);
  });

  afterAll(async () => {
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
  });

  afterEach(async () => {
    await donacionModel.deleteMany({});
    await suscripcionModel.deleteMany({});
    await refugioModel.deleteMany({});
    await userModel.deleteMany({});
    await notificacionModel.deleteMany({});
    jest.clearAllMocks();
    // Restore default mock implementations after clearAllMocks
    stripeMock.paymentIntents.create.mockResolvedValue({
      id: 'pi_test_123',
      client_secret: 'pi_test_123_secret',
    });
    stripeMock.customers.create.mockResolvedValue({ id: 'cus_test_123' });
    stripeMock.prices.create.mockResolvedValue({ id: 'price_test_123' });
    stripeMock.subscriptions.create.mockResolvedValue({ id: 'sub_test_123' });
    stripeMock.subscriptions.cancel.mockResolvedValue({});
    emailQueueMock.add.mockResolvedValue(undefined);
  });

  // ── crearPaymentIntent ────────────────────────────────────────────────────

  describe('crearPaymentIntent', () => {
    it('crea un PaymentIntent y retorna clientSecret', async () => {
      const refugio = await crearRefugioVerificado();
      const user = await crearUsuario();

      const result = await service.crearPaymentIntent(user._id.toString(), {
        refugioId: refugio._id.toString(),
        monto: 50000,
      });

      expect(result.clientSecret).toBe('pi_test_123_secret');
      expect(result.donacionId).toBeDefined();
      expect(result.numeroReferencia).toMatch(/^MP-/);
      expect(stripeMock.paymentIntents.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 50000, currency: 'cop' }),
      );
    });

    it('lanza NotFoundException si el refugio no existe', async () => {
      const user = await crearUsuario();

      await expect(
        service.crearPaymentIntent(user._id.toString(), {
          refugioId: new Types.ObjectId().toString(),
          monto: 50000,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si el refugio no está verificado', async () => {
      const refugio = await refugioModel.create({
        userId: new Types.ObjectId(),
        nombre: 'Pendiente',
        estado: 'pendiente_verificacion',
      });
      const user = await crearUsuario();

      await expect(
        service.crearPaymentIntent(user._id.toString(), {
          refugioId: refugio._id.toString(),
          monto: 50000,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── procesarWebhook ───────────────────────────────────────────────────────

  describe('procesarWebhook', () => {
    it('retorna { received: true } para evento desconocido', async () => {
      stripeMock.webhooks.constructEvent.mockReturnValue({
        type: 'some.other.event',
        data: { object: {} },
      });

      const result = await service.procesarWebhook(Buffer.from('{}'), 'sig');

      expect(result.received).toBe(true);
    });

    it('marca donación como completada en payment_intent.succeeded', async () => {
      const refugio = await crearRefugioVerificado();
      const user = await crearUsuario();

      const donacion = await donacionModel.create({
        refugioId: refugio._id,
        donanteId: user._id,
        monto: 50000,
        moneda: 'COP',
        stripePaymentIntentId: 'pi_webhook_test',
        numeroReferencia: 'MP-webhook-test',
        estado: 'pendiente',
      });

      stripeMock.webhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_webhook_test' } },
      });

      await service.procesarWebhook(Buffer.from('{}'), 'sig');

      const updated = await donacionModel.findById(donacion._id);
      expect(updated!.estado).toBe('completada');
    });

    it('marca donación como fallida en payment_intent.payment_failed', async () => {
      const refugio = await crearRefugioVerificado();
      const user = await crearUsuario();

      const donacion = await donacionModel.create({
        refugioId: refugio._id,
        donanteId: user._id,
        monto: 50000,
        moneda: 'COP',
        stripePaymentIntentId: 'pi_failed_test',
        numeroReferencia: 'MP-failed-test',
        estado: 'pendiente',
      });

      stripeMock.webhooks.constructEvent.mockReturnValue({
        type: 'payment_intent.payment_failed',
        data: { object: { id: 'pi_failed_test' } },
      });

      await service.procesarWebhook(Buffer.from('{}'), 'sig');

      const updated = await donacionModel.findById(donacion._id);
      expect(updated!.estado).toBe('fallida');
    });

    it('lanza BadRequestException para firma inválida', async () => {
      stripeMock.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(service.procesarWebhook(Buffer.from('{}'), 'bad-sig')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── cancelarSuscripcion ───────────────────────────────────────────────────

  describe('cancelarSuscripcion', () => {
    it('cancela la suscripción del donante', async () => {
      const user = await crearUsuario();
      const refugio = await crearRefugioVerificado();

      const sub = await suscripcionModel.create({
        refugioId: refugio._id,
        donanteId: user._id,
        montoMensual: 30000,
        stripeSubscriptionId: 'sub_cancel_test',
        estado: 'activa',
      });

      const result = await service.cancelarSuscripcion(sub._id.toString(), user._id.toString());

      expect(result.estado).toBe('cancelada');
      expect(stripeMock.subscriptions.cancel).toHaveBeenCalledWith('sub_cancel_test');
    });

    it('lanza NotFoundException si la suscripción no existe', async () => {
      await expect(
        service.cancelarSuscripcion(new Types.ObjectId().toString(), 'user-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza ForbiddenException si el usuario no es el donante', async () => {
      const user = await crearUsuario();
      const refugio = await crearRefugioVerificado();

      const sub = await suscripcionModel.create({
        refugioId: refugio._id,
        donanteId: user._id,
        montoMensual: 30000,
        stripeSubscriptionId: 'sub_forbidden_test',
        estado: 'activa',
      });

      await expect(
        service.cancelarSuscripcion(sub._id.toString(), new Types.ObjectId().toString()),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── historialDonacionesByUserId ───────────────────────────────────────────

  describe('historialDonacionesByUserId', () => {
    it('lanza NotFoundException si el refugio no existe para el userId', async () => {
      await expect(
        service.historialDonacionesByUserId(new Types.ObjectId().toString(), 1, 10),
      ).rejects.toThrow(NotFoundException);
    });

    it('retorna historial paginado del refugio', async () => {
      const refugio = await crearRefugioVerificado();

      const result = await service.historialDonacionesByUserId(refugio.userId.toString(), 1, 10);

      expect(result.data).toBeDefined();
      expect(result.total).toBe(0);
    });
  });

  // ── historialDonaciones (por refugioId) ───────────────────────────────────

  describe('historialDonaciones', () => {
    it('retorna historial paginado por refugioId', async () => {
      const refugio = await crearRefugioVerificado();

      const result = await service.historialDonaciones(refugio._id.toString(), 1, 10);

      expect(result.data).toBeDefined();
      expect(result.total).toBe(0);
    });
  });

  // ── findById ──────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('retorna null para id inexistente', async () => {
      const result = await service.findById(new Types.ObjectId().toString());
      expect(result).toBeNull();
    });

    it('retorna la donación por id válido', async () => {
      const refugio = await crearRefugioVerificado();
      const user = await crearUsuario();

      const { donacionId } = await service.crearPaymentIntent(user._id.toString(), {
        refugioId: refugio._id.toString(),
        monto: 50000,
      });

      const found = await service.findById(donacionId);
      expect(found).not.toBeNull();
      expect(found!._id.toString()).toBe(donacionId);
    });
  });

  // ── crearSuscripcion ──────────────────────────────────────────────────────

  describe('crearSuscripcion', () => {
    it('crea una suscripción activa', async () => {
      const refugio = await crearRefugioVerificado();
      const user = await crearUsuario();

      const result = await service.crearSuscripcion(user._id.toString(), {
        refugioId: refugio._id.toString(),
        montoMensual: 30000,
      });

      expect(result.estado).toBe('activa');
      expect(result.montoMensual).toBe(30000);
      expect(stripeMock.prices.create).toHaveBeenCalledWith(
        expect.objectContaining({ unit_amount: 30000, currency: 'cop' }),
      );
    });

    it('reutiliza stripeCustomerId existente', async () => {
      const refugio = await crearRefugioVerificado();
      const user = await userModel.create({
        email: `existing-customer-${Date.now()}@test.com`,
        stripeCustomerId: 'cus_existing_123',
      });

      await service.crearSuscripcion(user._id.toString(), {
        refugioId: refugio._id.toString(),
        montoMensual: 20000,
      });

      expect(stripeMock.customers.create).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si el refugio no existe', async () => {
      const user = await crearUsuario();

      await expect(
        service.crearSuscripcion(user._id.toString(), {
          refugioId: new Types.ObjectId().toString(),
          montoMensual: 30000,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza BadRequestException si el refugio no está verificado', async () => {
      const refugio = await refugioModel.create({
        userId: new Types.ObjectId(),
        nombre: 'Pendiente',
        estado: 'pendiente_verificacion',
      });
      const user = await crearUsuario();

      await expect(
        service.crearSuscripcion(user._id.toString(), {
          refugioId: refugio._id.toString(),
          montoMensual: 30000,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza NotFoundException si el usuario no existe', async () => {
      const refugio = await crearRefugioVerificado();

      await expect(
        service.crearSuscripcion(new Types.ObjectId().toString(), {
          refugioId: refugio._id.toString(),
          montoMensual: 30000,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
