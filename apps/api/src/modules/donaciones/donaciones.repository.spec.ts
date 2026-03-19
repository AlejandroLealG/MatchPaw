import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, Connection, Model, Schema, Types } from 'mongoose';
import { Donacion, DonacionSchema } from './schemas/donacion.schema';
import {
  SuscripcionDonacion,
  SuscripcionDonacionSchema,
} from './schemas/suscripcion-donacion.schema';
import { DonacionesRepository } from './donaciones.repository';

// Minimal User schema so Mongoose can resolve the 'User' ref used in populate
const UserMinSchema = new Schema({ email: String });

describe('DonacionesRepository', () => {
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let donacionModel: Model<Donacion>;
  let suscripcionModel: Model<SuscripcionDonacion>;
  let repo: DonacionesRepository;

  const refugioId = new Types.ObjectId();
  const donanteId = new Types.ObjectId();

  function makeDonacion(overrides: Partial<Donacion> = {}): Partial<Donacion> {
    return {
      refugioId,
      donanteId,
      monto: 50000,
      moneda: 'COP',
      stripePaymentIntentId: `pi_${Date.now()}_${Math.random()}`,
      numeroReferencia: `MP-${Date.now()}-${Math.random()}`,
      estado: 'pendiente',
      ...overrides,
    };
  }

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const conn = await connect(mongod.getUri());
    mongoConnection = conn.connection;

    // Register User schema so Mongoose can resolve the 'User' ref in populate
    mongoConnection.model('User', UserMinSchema);
    donacionModel = mongoConnection.model(Donacion.name, DonacionSchema);
    suscripcionModel = mongoConnection.model(SuscripcionDonacion.name, SuscripcionDonacionSchema);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DonacionesRepository,
        { provide: getModelToken(Donacion.name), useValue: donacionModel },
        {
          provide: getModelToken(SuscripcionDonacion.name),
          useValue: suscripcionModel,
        },
      ],
    }).compile();

    repo = module.get<DonacionesRepository>(DonacionesRepository);
  });

  afterAll(async () => {
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
  });

  afterEach(async () => {
    await donacionModel.deleteMany({});
    await suscripcionModel.deleteMany({});
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('crea una donación con estado pendiente', async () => {
      const doc = await repo.create(makeDonacion());

      expect(doc._id).toBeDefined();
      expect(doc.estado).toBe('pendiente');
      expect(doc.monto).toBe(50000);
      expect(doc.moneda).toBe('COP');
    });
  });

  // ── findById ──────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('retorna la donación por id válido', async () => {
      const created = await repo.create(makeDonacion());
      const found = await repo.findById(created._id.toString());

      expect(found).not.toBeNull();
      expect(found!._id.toString()).toBe(created._id.toString());
    });

    it('retorna null para id inválido', async () => {
      expect(await repo.findById('id-invalido')).toBeNull();
    });

    it('retorna null para id inexistente', async () => {
      expect(await repo.findById(new Types.ObjectId().toString())).toBeNull();
    });
  });

  // ── findByStripePaymentIntentId ───────────────────────────────────────────

  describe('findByStripePaymentIntentId', () => {
    it('retorna la donación por stripePaymentIntentId', async () => {
      const piId = `pi_test_${Date.now()}`;
      await repo.create(makeDonacion({ stripePaymentIntentId: piId }));

      const found = await repo.findByStripePaymentIntentId(piId);
      expect(found).not.toBeNull();
      expect(found!.stripePaymentIntentId).toBe(piId);
    });

    it('retorna null si no existe', async () => {
      expect(await repo.findByStripePaymentIntentId('pi_inexistente')).toBeNull();
    });
  });

  // ── findByRefugio ─────────────────────────────────────────────────────────

  describe('findByRefugio', () => {
    it('retorna solo donaciones completadas del refugio', async () => {
      await repo.create(makeDonacion({ estado: 'completada' }));
      await repo.create(makeDonacion({ estado: 'pendiente' }));
      await repo.create(makeDonacion({ estado: 'fallida' }));

      const result = await repo.findByRefugio(refugioId.toString(), 1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].estado).toBe('completada');
    });

    it('retorna paginación correcta', async () => {
      for (let i = 0; i < 5; i++) {
        await repo.create(makeDonacion({ estado: 'completada' }));
      }

      const result = await repo.findByRefugio(refugioId.toString(), 1, 3);

      expect(result.data).toHaveLength(3);
      expect(result.total).toBe(5);
      expect(result.totalPages).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(3);
    });

    it('retorna vacío para refugioId inválido', async () => {
      const result = await repo.findByRefugio('id-invalido', 1, 10);
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // ── updateEstado ──────────────────────────────────────────────────────────

  describe('updateEstado', () => {
    it('actualiza el estado de la donación', async () => {
      const created = await repo.create(makeDonacion());
      const updated = await repo.updateEstado(created._id.toString(), 'completada');

      expect(updated!.estado).toBe('completada');
    });

    it('retorna null para id inválido', async () => {
      expect(await repo.updateEstado('id-invalido', 'completada')).toBeNull();
    });
  });

  // ── createSuscripcion ─────────────────────────────────────────────────────

  describe('createSuscripcion', () => {
    it('crea una suscripción activa', async () => {
      const sub = await repo.createSuscripcion({
        refugioId,
        donanteId,
        montoMensual: 30000,
        stripeSubscriptionId: `sub_${Date.now()}`,
        estado: 'activa',
      });

      expect(sub._id).toBeDefined();
      expect(sub.estado).toBe('activa');
      expect(sub.montoMensual).toBe(30000);
    });
  });

  // ── cancelarSuscripcion ───────────────────────────────────────────────────

  describe('cancelarSuscripcion', () => {
    it('cancela la suscripción', async () => {
      const sub = await repo.createSuscripcion({
        refugioId,
        donanteId,
        montoMensual: 30000,
        stripeSubscriptionId: `sub_cancel_${Date.now()}`,
        estado: 'activa',
      });

      const cancelled = await repo.cancelarSuscripcion(sub._id.toString());
      expect(cancelled!.estado).toBe('cancelada');
    });

    it('retorna null para id inválido', async () => {
      expect(await repo.cancelarSuscripcion('id-invalido')).toBeNull();
    });
  });

  // ── findSuscripcionById ───────────────────────────────────────────────────

  describe('findSuscripcionById', () => {
    it('retorna la suscripción por id', async () => {
      const sub = await repo.createSuscripcion({
        refugioId,
        donanteId,
        montoMensual: 20000,
        stripeSubscriptionId: `sub_find_${Date.now()}`,
        estado: 'activa',
      });

      const found = await repo.findSuscripcionById(sub._id.toString());
      expect(found).not.toBeNull();
      expect(found!._id.toString()).toBe(sub._id.toString());
    });

    it('retorna null para id inválido', async () => {
      expect(await repo.findSuscripcionById('id-invalido')).toBeNull();
    });
  });
});
