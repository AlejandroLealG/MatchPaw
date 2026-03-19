import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, Connection, Model, Schema, Types } from 'mongoose';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bull';
import { Solicitud, SolicitudSchema } from './schemas/solicitud.schema';
import { Animal, AnimalSchema } from '../animales/schemas/animal.schema';
import { Refugio, RefugioSchema } from '../refugios/schemas/refugio.schema';
import { SolicitudesRepository } from './solicitudes.repository';
import { SolicitudesService } from './solicitudes.service';
import { CreateSolicitudDto, UpdateSolicitudEstadoDto } from '@matchpaw/shared';

const NotificacionPlaceholderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    tipo: String,
    titulo: String,
    cuerpo: String,
    leida: { type: Boolean, default: false },
  },
  { collection: 'notificaciones', timestamps: true },
);

// Minimal User schema so Mongoose can resolve the 'User' ref used in populate
const UserSchema = new Schema({ email: String });

describe('SolicitudesService', () => {
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let solicitudModel: Model<Solicitud>;
  let animalModel: Model<Animal>;
  let refugioModel: Model<Refugio>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let notificacionModel: Model<any>;
  let service: SolicitudesService;

  // Fake Bull queue — no Redis needed in tests
  const emailQueueMock = { add: jest.fn().mockResolvedValue(undefined) };

  const refugioUserId = new Types.ObjectId();
  const adoptanteId = new Types.ObjectId();

  async function crearRefugioVerificado() {
    return refugioModel.create({
      userId: refugioUserId,
      nombre: 'Refugio Test',
      descripcion: 'Desc',
      ciudad: 'Bogotá',
      direccion: 'Calle 1',
      telefono: '3001234567',
      estado: 'verificado',
    });
  }

  async function crearAnimalDisponible(refugioId: Types.ObjectId) {
    return animalModel.create({
      refugioId,
      nombre: 'Firulais',
      especie: 'perro',
      raza: 'Labrador',
      edadMeses: 12,
      sexo: 'macho',
      tamano: 'mediano',
      descripcion: 'Perro amigable',
      estadoSalud: 'Sano',
      vacunado: true,
      esterilizado: false,
      estado: 'disponible',
      fotos: [{ url: 'http://img.test/1.jpg', orden: 1 }],
    });
  }

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    const conn = await connect(uri);
    mongoConnection = conn.connection;

    solicitudModel = mongoConnection.model(Solicitud.name, SolicitudSchema);
    animalModel = mongoConnection.model(Animal.name, AnimalSchema);
    refugioModel = mongoConnection.model(Refugio.name, RefugioSchema);
    // Register User schema so Mongoose can resolve the 'User' ref in populate
    mongoConnection.model('User', UserSchema);
    notificacionModel = mongoConnection.model('Notificacion', NotificacionPlaceholderSchema);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SolicitudesRepository,
        SolicitudesService,
        { provide: getModelToken(Solicitud.name), useValue: solicitudModel },
        { provide: getModelToken(Animal.name), useValue: animalModel },
        { provide: getModelToken('Animal'), useValue: animalModel },
        { provide: getModelToken(Refugio.name), useValue: refugioModel },
        { provide: getModelToken('Refugio'), useValue: refugioModel },
        { provide: getModelToken('Notificacion'), useValue: notificacionModel },
        { provide: getQueueToken('email'), useValue: emailQueueMock },
      ],
    }).compile();

    service = module.get<SolicitudesService>(SolicitudesService);
  });

  afterAll(async () => {
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
  });

  afterEach(async () => {
    await solicitudModel.deleteMany({});
    await animalModel.deleteMany({});
    await refugioModel.deleteMany({});
    jest.clearAllMocks();
  });

  // ── enviar ──────────────────────────────────────────────────────────────

  describe('enviar', () => {
    it('crea solicitud con estado pendiente', async () => {
      const refugio = await crearRefugioVerificado();
      const animal = await crearAnimalDisponible(refugio._id);

      const dto: CreateSolicitudDto = {
        animalId: animal._id.toString(),
        descripcionHogar: 'Casa con jardín',
      };

      const doc = await service.enviar(adoptanteId.toString(), dto);

      expect(doc.estado).toBe('pendiente');
      expect(doc.animalId.toString()).toBe(animal._id.toString());
      expect(doc.adoptanteId.toString()).toBe(adoptanteId.toString());
    });

    it('encola email al refugio al crear solicitud', async () => {
      const refugio = await crearRefugioVerificado();
      const animal = await crearAnimalDisponible(refugio._id);

      await service.enviar(adoptanteId.toString(), {
        animalId: animal._id.toString(),
      });

      expect(emailQueueMock.add).toHaveBeenCalledWith(
        'nueva-solicitud-refugio',
        expect.objectContaining({ animalNombre: 'Firulais' }),
      );
    });

    it('lanza NotFoundException si el animal no existe', async () => {
      await expect(
        service.enviar(adoptanteId.toString(), {
          animalId: new Types.ObjectId().toString(),
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza ConflictException si el animal no está disponible', async () => {
      const refugio = await crearRefugioVerificado();
      const animal = await animalModel.create({
        refugioId: refugio._id,
        nombre: 'Adoptado',
        especie: 'perro',
        raza: 'Labrador',
        edadMeses: 12,
        sexo: 'macho',
        tamano: 'mediano',
        descripcion: 'Desc',
        estadoSalud: 'Sano',
        vacunado: true,
        esterilizado: false,
        estado: 'adoptado',
        fotos: [{ url: 'http://img.test/1.jpg', orden: 1 }],
      });

      await expect(
        service.enviar(adoptanteId.toString(), {
          animalId: animal._id.toString(),
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('lanza ConflictException si ya existe solicitud activa para el mismo animal — Requisito 5.6', async () => {
      const refugio = await crearRefugioVerificado();
      const animal = await crearAnimalDisponible(refugio._id);
      const dto: CreateSolicitudDto = { animalId: animal._id.toString() };

      await service.enviar(adoptanteId.toString(), dto);

      await expect(service.enviar(adoptanteId.toString(), dto)).rejects.toThrow(ConflictException);
    });
  });

  // ── cambiarEstado ────────────────────────────────────────────────────────

  describe('cambiarEstado', () => {
    it('aprueba una solicitud pendiente', async () => {
      const refugio = await crearRefugioVerificado();
      const animal = await crearAnimalDisponible(refugio._id);
      const solicitud = await service.enviar(adoptanteId.toString(), {
        animalId: animal._id.toString(),
      });

      const dto: UpdateSolicitudEstadoDto = { estado: 'aprobada', motivo: 'Perfil ideal' };
      const updated = await service.cambiarEstado(
        solicitud._id.toString(),
        refugioUserId.toString(),
        dto,
      );

      expect(updated.estado).toBe('aprobada');
    });

    it('rechaza una solicitud pendiente', async () => {
      const refugio = await crearRefugioVerificado();
      const animal = await crearAnimalDisponible(refugio._id);
      const solicitud = await service.enviar(adoptanteId.toString(), {
        animalId: animal._id.toString(),
      });

      const dto: UpdateSolicitudEstadoDto = { estado: 'rechazada', motivo: 'No cumple' };
      const updated = await service.cambiarEstado(
        solicitud._id.toString(),
        refugioUserId.toString(),
        dto,
      );

      expect(updated.estado).toBe('rechazada');
    });

    it('encola email al adoptante al cambiar estado', async () => {
      const refugio = await crearRefugioVerificado();
      const animal = await crearAnimalDisponible(refugio._id);
      const solicitud = await service.enviar(adoptanteId.toString(), {
        animalId: animal._id.toString(),
      });

      await service.cambiarEstado(solicitud._id.toString(), refugioUserId.toString(), {
        estado: 'aprobada',
      });

      expect(emailQueueMock.add).toHaveBeenCalledWith(
        'cambio-estado-solicitud',
        expect.objectContaining({ estado: 'aprobada' }),
      );
    });

    it('lanza ConflictException si la solicitud ya fue procesada', async () => {
      const refugio = await crearRefugioVerificado();
      const animal = await crearAnimalDisponible(refugio._id);
      const solicitud = await service.enviar(adoptanteId.toString(), {
        animalId: animal._id.toString(),
      });

      await service.cambiarEstado(solicitud._id.toString(), refugioUserId.toString(), {
        estado: 'aprobada',
      });

      await expect(
        service.cambiarEstado(solicitud._id.toString(), refugioUserId.toString(), {
          estado: 'rechazada',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('lanza ForbiddenException si el usuario no es propietario del refugio', async () => {
      const refugio = await crearRefugioVerificado();
      const animal = await crearAnimalDisponible(refugio._id);
      const solicitud = await service.enviar(adoptanteId.toString(), {
        animalId: animal._id.toString(),
      });

      await expect(
        service.cambiarEstado(solicitud._id.toString(), new Types.ObjectId().toString(), {
          estado: 'aprobada',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('lanza NotFoundException si la solicitud no existe', async () => {
      await expect(
        service.cambiarEstado(new Types.ObjectId().toString(), refugioUserId.toString(), {
          estado: 'aprobada',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── historialAdoptante ───────────────────────────────────────────────────

  describe('historialAdoptante', () => {
    it('retorna todas las solicitudes del adoptante — Requisito 5.4', async () => {
      const refugio = await crearRefugioVerificado();
      const animal1 = await crearAnimalDisponible(refugio._id);
      const animal2 = await animalModel.create({
        refugioId: refugio._id,
        nombre: 'Luna',
        especie: 'gato',
        raza: 'Siamés',
        edadMeses: 6,
        sexo: 'hembra',
        tamano: 'pequeno',
        descripcion: 'Gata tranquila',
        estadoSalud: 'Sana',
        vacunado: true,
        esterilizado: true,
        estado: 'disponible',
        fotos: [{ url: 'http://img.test/2.jpg', orden: 1 }],
      });

      await service.enviar(adoptanteId.toString(), {
        animalId: animal1._id.toString(),
      });
      await service.enviar(adoptanteId.toString(), {
        animalId: animal2._id.toString(),
      });

      const historial = await service.historialAdoptante(adoptanteId.toString());
      expect(historial).toHaveLength(2);
    });

    it('retorna lista vacía si el adoptante no tiene solicitudes', async () => {
      const historial = await service.historialAdoptante(new Types.ObjectId().toString());
      expect(historial).toHaveLength(0);
    });
  });

  // ── historialRefugio ─────────────────────────────────────────────────────

  describe('historialRefugio', () => {
    it('retorna solicitudes agrupadas por animal — Requisito 5.5', async () => {
      const refugio = await crearRefugioVerificado();
      const animal = await crearAnimalDisponible(refugio._id);

      await service.enviar(adoptanteId.toString(), {
        animalId: animal._id.toString(),
      });

      const historial = await service.historialRefugio(refugioUserId.toString());

      expect(historial).toHaveLength(1);
      expect(historial[0].animalId).toBe(animal._id.toString());
      expect(historial[0].solicitudes).toHaveLength(1);
    });

    it('lanza NotFoundException si el refugio no existe', async () => {
      await expect(service.historialRefugio(new Types.ObjectId().toString())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('retorna lista vacía si el refugio no tiene animales con solicitudes', async () => {
      await crearRefugioVerificado();

      const historial = await service.historialRefugio(refugioUserId.toString());
      expect(historial).toHaveLength(0);
    });
  });
});
