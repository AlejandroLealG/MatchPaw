import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { getQueueToken } from '@nestjs/bull';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, Connection, Model, Schema, Types } from 'mongoose';
import { Refugio, RefugioSchema } from '../refugios/schemas/refugio.schema';
import { RefugiosRepository } from '../refugios/refugios.repository';
import { AdminService } from './admin.service';

// Minimal schemas for cross-module models
const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, default: null },
    role: { type: String, enum: ['adoptante', 'refugio', 'admin'], required: true },
    activo: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const DonacionSchema = new Schema(
  {
    refugioId: { type: Types.ObjectId, ref: 'Refugio' },
    donanteId: { type: Types.ObjectId, ref: 'User' },
    monto: Number,
    moneda: { type: String, default: 'COP' },
    stripePaymentIntentId: { type: String, unique: true },
    numeroReferencia: { type: String, unique: true },
    estado: { type: String, enum: ['pendiente', 'completada', 'fallida'], default: 'pendiente' },
  },
  { timestamps: true },
);

describe('AdminService', () => {
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let refugioModel: Model<Refugio>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let userModel: Model<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let donacionModel: Model<any>;
  let service: AdminService;

  const emailQueueMock = { add: jest.fn().mockResolvedValue(undefined) };

  async function crearRefugio(userId: Types.ObjectId, estado = 'pendiente_verificacion') {
    return refugioModel.create({
      userId,
      nombre: 'Refugio Test',
      descripcion: 'Desc',
      ciudad: 'Bogotá',
      direccion: 'Calle 1',
      telefono: '3001234567',
      estado,
    });
  }

  async function crearUsuario(email: string, role = 'adoptante') {
    return userModel.create({ email, passwordHash: 'hash', role });
  }

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const conn = await connect(mongod.getUri());
    mongoConnection = conn.connection;

    refugioModel = mongoConnection.model(Refugio.name, RefugioSchema);
    userModel = mongoConnection.model('User', UserSchema);
    donacionModel = mongoConnection.model('Donacion', DonacionSchema);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefugiosRepository,
        AdminService,
        { provide: getModelToken(Refugio.name), useValue: refugioModel },
        { provide: getModelToken('User'), useValue: userModel },
        { provide: getModelToken('Donacion'), useValue: donacionModel },
        { provide: getQueueToken('email'), useValue: emailQueueMock },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  afterAll(async () => {
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
  });

  afterEach(async () => {
    await refugioModel.deleteMany({});
    await userModel.deleteMany({});
    await donacionModel.deleteMany({});
    jest.clearAllMocks();
  });

  // ── listarRefugios ────────────────────────────────────────────────────────

  describe('listarRefugios', () => {
    it('lista refugios por estado', async () => {
      await crearRefugio(new Types.ObjectId(), 'pendiente_verificacion');
      await crearRefugio(new Types.ObjectId(), 'verificado');

      const pendientes = await service.listarRefugios('pendiente_verificacion');
      expect(pendientes).toHaveLength(1);
      expect(pendientes[0].estado).toBe('pendiente_verificacion');
    });

    it('lista todos los refugios sin filtro', async () => {
      await crearRefugio(new Types.ObjectId(), 'pendiente_verificacion');
      await crearRefugio(new Types.ObjectId(), 'verificado');

      const todos = await service.listarRefugios();
      expect(todos.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── verificarRefugio ──────────────────────────────────────────────────────

  describe('verificarRefugio', () => {
    it('aprueba un refugio y encola email', async () => {
      await crearUsuario(`refugio-${Date.now()}@test.com`, 'refugio');
      const user = await userModel.findOne({ role: 'refugio' });
      const refugio = await crearRefugio(user!._id);

      const updated = await service.verificarRefugio(refugio._id.toString(), 'aprobar');

      expect(updated.estado).toBe('verificado');
      expect(emailQueueMock.add).toHaveBeenCalledWith(
        'verificacion-refugio',
        expect.objectContaining({ accion: 'aprobar' }),
      );
    });

    it('rechaza un refugio con motivo', async () => {
      const user = await crearUsuario(`refugio2-${Date.now()}@test.com`, 'refugio');
      const refugio = await crearRefugio(user._id);

      const updated = await service.verificarRefugio(
        refugio._id.toString(),
        'rechazar',
        'Documentación incompleta',
      );

      expect(updated.estado).toBe('rechazado');
      expect(updated.motivoRechazo).toBe('Documentación incompleta');
    });

    it('lanza BadRequestException al rechazar sin motivo', async () => {
      const user = await crearUsuario(`refugio3-${Date.now()}@test.com`, 'refugio');
      const refugio = await crearRefugio(user._id);

      await expect(service.verificarRefugio(refugio._id.toString(), 'rechazar')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('lanza NotFoundException si el refugio no existe', async () => {
      await expect(
        service.verificarRefugio(new Types.ObjectId().toString(), 'aprobar'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── listarUsuarios ────────────────────────────────────────────────────────

  describe('listarUsuarios', () => {
    it('retorna usuarios paginados', async () => {
      await crearUsuario(`u1-${Date.now()}@test.com`);
      await crearUsuario(`u2-${Date.now()}@test.com`);
      await crearUsuario(`u3-${Date.now()}@test.com`);

      const result = await service.listarUsuarios(1, 2);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.totalPages).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
    });
  });

  // ── cambiarEstadoUsuario ──────────────────────────────────────────────────

  describe('cambiarEstadoUsuario', () => {
    it('suspende un usuario activo', async () => {
      const user = await crearUsuario(`suspend-${Date.now()}@test.com`);

      const updated = await service.cambiarEstadoUsuario(user._id.toString(), 'suspender');

      expect(updated.activo).toBe(false);
    });

    it('activa un usuario suspendido', async () => {
      const user = await crearUsuario(`activate-${Date.now()}@test.com`);
      await userModel.findByIdAndUpdate(user._id, { activo: false });

      const updated = await service.cambiarEstadoUsuario(user._id.toString(), 'activar');

      expect(updated.activo).toBe(true);
    });

    it('lanza NotFoundException para id inválido', async () => {
      await expect(service.cambiarEstadoUsuario('id-invalido', 'suspender')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('lanza NotFoundException para id inexistente', async () => {
      await expect(
        service.cambiarEstadoUsuario(new Types.ObjectId().toString(), 'suspender'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── listarDonaciones ──────────────────────────────────────────────────────

  describe('listarDonaciones', () => {
    it('retorna donaciones paginadas', async () => {
      const refugioId = new Types.ObjectId();
      const donanteId = new Types.ObjectId();

      for (let i = 0; i < 3; i++) {
        await donacionModel.create({
          refugioId,
          donanteId,
          monto: 50000,
          moneda: 'COP',
          stripePaymentIntentId: `pi_${Date.now()}_${i}`,
          numeroReferencia: `MP-${Date.now()}-${i}`,
          estado: 'completada',
        });
      }

      const result = await service.listarDonaciones(1, 2);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.totalPages).toBe(2);
    });

    it('retorna lista vacía si no hay donaciones', async () => {
      const result = await service.listarDonaciones(1, 10);
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });
});
