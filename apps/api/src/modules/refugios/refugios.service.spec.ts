import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, Connection, Model, Schema, Types } from 'mongoose';
import { Refugio, RefugioSchema } from './schemas/refugio.schema';
import { RefugiosRepository } from './refugios.repository';
import { RefugiosService } from './refugios.service';

// Minimal schemas for cross-module models
const AnimalMinSchema = new Schema({ refugioId: { type: Types.ObjectId } });
const SolicitudMinSchema = new Schema({
  animalId: { type: Types.ObjectId },
  estado: String,
});
const DonacionMinSchema = new Schema({
  refugioId: { type: Types.ObjectId },
  estado: String,
  monto: Number,
  createdAt: Date,
});

describe('RefugiosService', () => {
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let refugioModel: Model<Refugio>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let animalModel: Model<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let solicitudModel: Model<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let donacionModel: Model<any>;
  let service: RefugiosService;

  const userId = new Types.ObjectId();
  const otroUserId = new Types.ObjectId();

  const baseData = {
    nombre: 'Refugio Test',
    descripcion: 'Descripción del refugio',
    ciudad: 'Bogotá',
    direccion: 'Calle 1 # 2-3',
    telefono: '3001234567',
  };

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const conn = await connect(mongod.getUri());
    mongoConnection = conn.connection;

    refugioModel = mongoConnection.model(Refugio.name, RefugioSchema);
    animalModel = mongoConnection.model('Animal', AnimalMinSchema);
    solicitudModel = mongoConnection.model('Solicitud', SolicitudMinSchema);
    donacionModel = mongoConnection.model('Donacion', DonacionMinSchema);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefugiosRepository,
        RefugiosService,
        { provide: getModelToken(Refugio.name), useValue: refugioModel },
        { provide: getModelToken('Animal'), useValue: animalModel },
        { provide: getModelToken('Solicitud'), useValue: solicitudModel },
        { provide: getModelToken('Donacion'), useValue: donacionModel },
      ],
    }).compile();

    service = module.get<RefugiosService>(RefugiosService);
  });

  afterAll(async () => {
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
  });

  afterEach(async () => {
    await refugioModel.deleteMany({});
    await animalModel.deleteMany({});
    await solicitudModel.deleteMany({});
    await donacionModel.deleteMany({});
  });

  // ── crearPerfil ───────────────────────────────────────────────────────────

  describe('crearPerfil', () => {
    it('crea un perfil de refugio con estado pendiente_verificacion', async () => {
      const refugio = await service.crearPerfil(userId.toString(), baseData);

      expect(refugio.nombre).toBe('Refugio Test');
      expect(refugio.estado).toBe('pendiente_verificacion');
      expect(refugio.userId.toString()).toBe(userId.toString());
    });

    it('lanza ConflictException si el usuario ya tiene un refugio', async () => {
      await service.crearPerfil(userId.toString(), baseData);

      await expect(
        service.crearPerfil(userId.toString(), { ...baseData, nombre: 'Otro' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── findById ──────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('retorna el refugio por id válido', async () => {
      const created = await service.crearPerfil(userId.toString(), baseData);
      const found = await service.findById(created._id.toString());

      expect(found._id.toString()).toBe(created._id.toString());
    });

    it('lanza NotFoundException para id inexistente', async () => {
      await expect(service.findById(new Types.ObjectId().toString())).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── findByUserId ──────────────────────────────────────────────────────────

  describe('findByUserId', () => {
    it('retorna el refugio del usuario', async () => {
      await service.crearPerfil(userId.toString(), baseData);
      const found = await service.findByUserId(userId.toString());

      expect(found.userId.toString()).toBe(userId.toString());
    });

    it('lanza NotFoundException si el usuario no tiene refugio', async () => {
      await expect(service.findByUserId(new Types.ObjectId().toString())).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── editarPerfil ──────────────────────────────────────────────────────────

  describe('editarPerfil', () => {
    it('edita el perfil si el usuario es propietario', async () => {
      const refugio = await service.crearPerfil(userId.toString(), baseData);

      const updated = await service.editarPerfil(refugio._id.toString(), userId.toString(), {
        nombre: 'Nuevo Nombre',
        ciudad: 'Medellín',
      });

      expect(updated.nombre).toBe('Nuevo Nombre');
      expect(updated.ciudad).toBe('Medellín');
    });

    it('lanza ForbiddenException si el usuario no es propietario', async () => {
      const refugio = await service.crearPerfil(userId.toString(), baseData);

      await expect(
        service.editarPerfil(refugio._id.toString(), otroUserId.toString(), { nombre: 'Hack' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lanza NotFoundException si el refugio no existe', async () => {
      await expect(
        service.editarPerfil(new Types.ObjectId().toString(), userId.toString(), { nombre: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── obtenerMetricas ───────────────────────────────────────────────────────

  describe('obtenerMetricas', () => {
    it('retorna métricas correctas para el refugio', async () => {
      const refugio = await service.crearPerfil(userId.toString(), baseData);
      const refugioId = refugio._id;

      // Crear animales
      const animal1 = new Types.ObjectId();
      const animal2 = new Types.ObjectId();
      await animalModel.create([{ refugioId }, { refugioId }]);

      // Crear solicitudes
      await solicitudModel.create([
        { animalId: animal1, estado: 'pendiente' },
        { animalId: animal2, estado: 'aprobada' },
      ]);

      // Crear donación del mes
      await donacionModel.create({
        refugioId,
        estado: 'completada',
        monto: 50000,
        createdAt: new Date(),
      });

      const metricas = await service.obtenerMetricas(refugioId.toString(), userId.toString());

      expect(metricas.totalAnimales).toBe(2);
      expect(metricas.donacionesDelMes).toBe(1);
    });

    it('lanza ForbiddenException si el usuario no es propietario', async () => {
      const refugio = await service.crearPerfil(userId.toString(), baseData);

      await expect(
        service.obtenerMetricas(refugio._id.toString(), otroUserId.toString()),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lanza NotFoundException si el refugio no existe', async () => {
      await expect(
        service.obtenerMetricas(new Types.ObjectId().toString(), userId.toString()),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── toDto ─────────────────────────────────────────────────────────────────

  describe('toDto', () => {
    it('serializa el documento a IRefugio', async () => {
      const refugio = await service.crearPerfil(userId.toString(), baseData);
      const dto = service.toDto(refugio);

      expect(dto._id).toBe(refugio._id.toString());
      expect(dto.nombre).toBe('Refugio Test');
      expect(dto.estado).toBe('pendiente_verificacion');
    });
  });
});
