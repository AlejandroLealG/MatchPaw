import { getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, Connection, Model, Types } from 'mongoose';
import { Animal, AnimalSchema } from './schemas/animal.schema';
import { AnimalesRepository } from './animales.repository';
import { CreateAnimalDto } from '@matchpaw/shared';

describe('AnimalesRepository', () => {
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let animalModel: Model<Animal>;
  let repo: AnimalesRepository;

  const refugioId = new Types.ObjectId().toString();

  const baseDto: CreateAnimalDto = {
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
    fotos: [{ url: 'http://img.test/1.jpg', orden: 1 }],
  };

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    const conn = await connect(uri);
    mongoConnection = conn.connection;
    animalModel = mongoConnection.model(Animal.name, AnimalSchema);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnimalesRepository,
        { provide: getModelToken(Animal.name), useValue: animalModel },
      ],
    }).compile();

    repo = module.get<AnimalesRepository>(AnimalesRepository);
  });

  afterAll(async () => {
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
  });

  afterEach(async () => {
    await animalModel.deleteMany({});
  });

  describe('create', () => {
    it('crea un animal con los campos correctos', async () => {
      const doc = await repo.create(refugioId, baseDto);

      expect(doc._id).toBeDefined();
      expect(doc.nombre).toBe('Firulais');
      expect(doc.especie).toBe('perro');
      expect(doc.estado).toBe('disponible');
      expect(doc.refugioId.toString()).toBe(refugioId);
    });
  });

  describe('findById', () => {
    it('retorna el animal por id válido', async () => {
      const created = await repo.create(refugioId, baseDto);
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

  describe('findAll', () => {
    it('retorna solo animales disponibles de refugios verificados', async () => {
      const rid1 = new Types.ObjectId();
      const rid2 = new Types.ObjectId();

      await animalModel.create([
        { ...baseDto, refugioId: rid1, estado: 'disponible' },
        { ...baseDto, nombre: 'Adoptado', refugioId: rid1, estado: 'adoptado' },
        { ...baseDto, nombre: 'OtroRefugio', refugioId: rid2, estado: 'disponible' },
      ]);

      // Solo rid1 está verificado
      const result = await repo.findAll({}, [rid1]);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].nombre).toBe('Firulais');
      expect(result.total).toBe(1);
    });

    it('retorna paginación correcta', async () => {
      const rid = new Types.ObjectId();
      await animalModel.create([
        { ...baseDto, nombre: 'A1', refugioId: rid, estado: 'disponible' },
        { ...baseDto, nombre: 'A2', refugioId: rid, estado: 'disponible' },
        { ...baseDto, nombre: 'A3', refugioId: rid, estado: 'disponible' },
      ]);

      const result = await repo.findAll({ page: 1, limit: 2 }, [rid]);

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.totalPages).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(2);
    });

    it('filtra por especie', async () => {
      const rid = new Types.ObjectId();
      await animalModel.create([
        { ...baseDto, nombre: 'Perro', refugioId: rid, especie: 'perro', estado: 'disponible' },
        { ...baseDto, nombre: 'Gato', refugioId: rid, especie: 'gato', estado: 'disponible' },
      ]);

      const result = await repo.findAll({ especie: 'gato' }, [rid]);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].nombre).toBe('Gato');
    });

    it('retorna lista vacía si no hay refugios verificados', async () => {
      const rid = new Types.ObjectId();
      await animalModel.create({ ...baseDto, refugioId: rid, estado: 'disponible' });

      const result = await repo.findAll({}, []);

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('update', () => {
    it('actualiza campos del animal', async () => {
      const created = await repo.create(refugioId, baseDto);
      const updated = await repo.update(created._id.toString(), { nombre: 'Rex' });

      expect(updated).not.toBeNull();
      expect(updated!.nombre).toBe('Rex');
    });

    it('retorna null para id inválido', async () => {
      const result = await repo.update('id-invalido', { nombre: 'Rex' });
      expect(result).toBeNull();
    });
  });

  describe('updateEstado', () => {
    it('cambia el estado del animal', async () => {
      const created = await repo.create(refugioId, baseDto);
      const updated = await repo.updateEstado(created._id.toString(), 'adoptado');

      expect(updated!.estado).toBe('adoptado');
    });

    it('retorna null para id inválido', async () => {
      const result = await repo.updateEstado('id-invalido', 'adoptado');
      expect(result).toBeNull();
    });
  });

  describe('findByRefugioId', () => {
    it('retorna todos los animales del refugio', async () => {
      const rid = new Types.ObjectId().toString();
      await repo.create(rid, baseDto);
      await repo.create(rid, { ...baseDto, nombre: 'Luna' });

      const result = await repo.findByRefugioId(rid);
      expect(result).toHaveLength(2);
    });

    it('retorna lista vacía para refugioId inválido', async () => {
      const result = await repo.findByRefugioId('id-invalido');
      expect(result).toHaveLength(0);
    });
  });
});
