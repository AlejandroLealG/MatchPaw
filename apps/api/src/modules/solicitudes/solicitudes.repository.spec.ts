import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, Connection, Model, Schema, Types } from 'mongoose';
import { Solicitud, SolicitudSchema } from './schemas/solicitud.schema';
import { AnimalSchema } from '../animales/schemas/animal.schema';
import { SolicitudesRepository } from './solicitudes.repository';
import { CreateSolicitudDto } from '@matchpaw/shared';

// Minimal User schema so Mongoose can resolve the 'User' ref used in populate
const UserSchema = new Schema({ email: String });

describe('SolicitudesRepository', () => {
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let solicitudModel: Model<Solicitud>;
  let repo: SolicitudesRepository;

  const animalId = new Types.ObjectId();
  const adoptanteId = new Types.ObjectId();

  const baseDto: CreateSolicitudDto = {
    animalId: animalId.toString(),
    descripcionHogar: 'Casa con jardín',
    experienciaMascotas: 'Sí, tuve un perro',
    motivoRefugio: 'Quiero darle un hogar',
  };

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    const conn = await connect(uri);
    mongoConnection = conn.connection;
    // Register referenced schemas so Mongoose populate() can resolve them
    mongoConnection.model('Animal', AnimalSchema);
    mongoConnection.model('User', UserSchema);
    solicitudModel = mongoConnection.model(Solicitud.name, SolicitudSchema);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SolicitudesRepository,
        { provide: getModelToken(Solicitud.name), useValue: solicitudModel },
      ],
    }).compile();

    repo = module.get<SolicitudesRepository>(SolicitudesRepository);
  });

  afterAll(async () => {
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
  });

  afterEach(async () => {
    await solicitudModel.deleteMany({});
  });

  describe('create', () => {
    it('crea una solicitud con estado pendiente', async () => {
      const doc = await repo.create(adoptanteId.toString(), baseDto);

      expect(doc._id).toBeDefined();
      expect(doc.estado).toBe('pendiente');
      expect(doc.animalId.toString()).toBe(animalId.toString());
      expect(doc.adoptanteId.toString()).toBe(adoptanteId.toString());
      expect(doc.descripcionHogar).toBe('Casa con jardín');
    });
  });

  describe('findById', () => {
    it('retorna la solicitud por id válido', async () => {
      const created = await repo.create(adoptanteId.toString(), baseDto);
      const found = await repo.findById(created._id.toString());

      expect(found).not.toBeNull();
      expect(found!._id.toString()).toBe(created._id.toString());
    });

    it('retorna null para id inválido', async () => {
      const result = await repo.findById('id-invalido');
      expect(result).toBeNull();
    });

    it('retorna null para id inexistente', async () => {
      const result = await repo.findById(new Types.ObjectId().toString());
      expect(result).toBeNull();
    });
  });

  describe('findByAdoptante', () => {
    it('retorna todas las solicitudes del adoptante', async () => {
      const otroAnimalId = new Types.ObjectId();
      await repo.create(adoptanteId.toString(), baseDto);
      await repo.create(adoptanteId.toString(), {
        animalId: otroAnimalId.toString(),
      });

      const result = await repo.findByAdoptante(adoptanteId.toString());
      expect(result).toHaveLength(2);
    });

    it('retorna lista vacía para adoptanteId inválido', async () => {
      const result = await repo.findByAdoptante('id-invalido');
      expect(result).toHaveLength(0);
    });

    it('no retorna solicitudes de otros adoptantes', async () => {
      const otroAdoptante = new Types.ObjectId();
      await repo.create(adoptanteId.toString(), baseDto);
      await repo.create(otroAdoptante.toString(), {
        animalId: new Types.ObjectId().toString(),
      });

      const result = await repo.findByAdoptante(adoptanteId.toString());
      expect(result).toHaveLength(1);
    });
  });

  describe('findByRefugio', () => {
    it('retorna solicitudes de los animales del refugio', async () => {
      const animal1 = new Types.ObjectId();
      const animal2 = new Types.ObjectId();
      const animalFuera = new Types.ObjectId();

      await repo.create(adoptanteId.toString(), { animalId: animal1.toString() });
      await repo.create(adoptanteId.toString(), { animalId: animal2.toString() });
      await repo.create(adoptanteId.toString(), { animalId: animalFuera.toString() });

      const result = await repo.findByRefugio([animal1, animal2]);
      expect(result).toHaveLength(2);
    });

    it('retorna lista vacía si no hay animales', async () => {
      const result = await repo.findByRefugio([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('findActiveByAnimalAndAdoptante', () => {
    it('retorna solicitud pendiente existente', async () => {
      await repo.create(adoptanteId.toString(), baseDto);

      const result = await repo.findActiveByAnimalAndAdoptante(
        animalId.toString(),
        adoptanteId.toString(),
      );

      expect(result).not.toBeNull();
      expect(result!.estado).toBe('pendiente');
    });

    it('retorna null si la solicitud está rechazada', async () => {
      const created = await repo.create(adoptanteId.toString(), baseDto);
      await repo.updateEstado(created._id.toString(), 'rechazada');

      const result = await repo.findActiveByAnimalAndAdoptante(
        animalId.toString(),
        adoptanteId.toString(),
      );

      expect(result).toBeNull();
    });

    it('retorna null para ids inválidos', async () => {
      const result = await repo.findActiveByAnimalAndAdoptante('id-invalido', 'id-invalido');
      expect(result).toBeNull();
    });
  });

  describe('updateEstado', () => {
    it('actualiza el estado de la solicitud', async () => {
      const created = await repo.create(adoptanteId.toString(), baseDto);
      const updated = await repo.updateEstado(created._id.toString(), 'aprobada');

      expect(updated!.estado).toBe('aprobada');
    });

    it('guarda el motivo de cambio de estado', async () => {
      const created = await repo.create(adoptanteId.toString(), baseDto);
      const updated = await repo.updateEstado(
        created._id.toString(),
        'rechazada',
        'No cumple requisitos',
      );

      expect(updated!.motivoCambioEstado).toBe('No cumple requisitos');
    });

    it('retorna null para id inválido', async () => {
      const result = await repo.updateEstado('id-invalido', 'aprobada');
      expect(result).toBeNull();
    });
  });

  describe('findAprobadaByAnimal', () => {
    it('retorna la solicitud aprobada del animal', async () => {
      const created = await repo.create(adoptanteId.toString(), baseDto);
      await repo.updateEstado(created._id.toString(), 'aprobada');

      const result = await repo.findAprobadaByAnimal(animalId.toString());
      expect(result).not.toBeNull();
      expect(result!.estado).toBe('aprobada');
    });

    it('retorna null si no hay solicitud aprobada', async () => {
      await repo.create(adoptanteId.toString(), baseDto);

      const result = await repo.findAprobadaByAnimal(animalId.toString());
      expect(result).toBeNull();
    });

    it('retorna null para id inválido', async () => {
      const result = await repo.findAprobadaByAnimal('id-invalido');
      expect(result).toBeNull();
    });
  });
});
