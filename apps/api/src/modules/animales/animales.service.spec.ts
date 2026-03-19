import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { connect, Connection, Model, Types } from 'mongoose';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Animal, AnimalSchema } from './schemas/animal.schema';
import { Refugio, RefugioSchema } from '../refugios/schemas/refugio.schema';
import { AnimalesRepository } from './animales.repository';
import { AnimalesService } from './animales.service';
import { CreateAnimalDto } from '@matchpaw/shared';

describe('AnimalesService', () => {
  let mongod: MongoMemoryServer;
  let mongoConnection: Connection;
  let animalModel: Model<Animal>;
  let refugioModel: Model<Refugio>;
  let service: AnimalesService;

  const userId = new Types.ObjectId();

  const baseAnimalDto: CreateAnimalDto = {
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

  async function crearRefugioVerificado() {
    return refugioModel.create({
      userId,
      nombre: 'Refugio Test',
      descripcion: 'Desc',
      ciudad: 'Bogotá',
      direccion: 'Calle 1',
      telefono: '3001234567',
      estado: 'verificado',
    });
  }

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    const conn = await connect(uri);
    mongoConnection = conn.connection;

    animalModel = mongoConnection.model(Animal.name, AnimalSchema);
    refugioModel = mongoConnection.model(Refugio.name, RefugioSchema);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnimalesRepository,
        AnimalesService,
        { provide: getModelToken(Animal.name), useValue: animalModel },
        { provide: getModelToken(Refugio.name), useValue: refugioModel },
        { provide: getModelToken('Refugio'), useValue: refugioModel },
      ],
    }).compile();

    service = module.get<AnimalesService>(AnimalesService);
  });

  afterAll(async () => {
    await mongoConnection.dropDatabase();
    await mongoConnection.close();
    await mongod.stop();
  });

  afterEach(async () => {
    await animalModel.deleteMany({});
    await refugioModel.deleteMany({});
  });

  describe('publicar', () => {
    it('publica un animal si el refugio está verificado', async () => {
      await crearRefugioVerificado();
      const doc = await service.publicar(userId.toString(), baseAnimalDto);

      expect(doc.nombre).toBe('Firulais');
      expect(doc.estado).toBe('disponible');
    });

    it('lanza NotFoundException si el refugio no existe', async () => {
      await expect(
        service.publicar(new Types.ObjectId().toString(), baseAnimalDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('lanza ForbiddenException si el refugio no está verificado', async () => {
      await refugioModel.create({
        userId,
        nombre: 'Refugio Pendiente',
        descripcion: 'Desc',
        ciudad: 'Bogotá',
        direccion: 'Calle 1',
        telefono: '3001234567',
        estado: 'pendiente_verificacion',
      });

      await expect(service.publicar(userId.toString(), baseAnimalDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('lanza BadRequestException si faltan campos obligatorios', async () => {
      await crearRefugioVerificado();

      await expect(
        service.publicar(userId.toString(), {
          ...baseAnimalDto,
          fotos: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('lanza BadRequestException si nombre está vacío', async () => {
      await crearRefugioVerificado();

      await expect(
        service.publicar(userId.toString(), { ...baseAnimalDto, nombre: '  ' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findById', () => {
    it('retorna el animal con datos del refugio', async () => {
      const refugio = await crearRefugioVerificado();
      const animal = await animalModel.create({
        ...baseAnimalDto,
        refugioId: refugio._id,
        estado: 'disponible',
      });

      const result = await service.findById(animal._id.toString());

      expect(result._id).toBe(animal._id.toString());
      expect(result.refugio.nombre).toBe('Refugio Test');
      expect(result.canRequest).toBe(true);
    });

    it('canRequest es false cuando el animal está adoptado', async () => {
      const refugio = await crearRefugioVerificado();
      const animal = await animalModel.create({
        ...baseAnimalDto,
        refugioId: refugio._id,
        estado: 'adoptado',
      });

      const result = await service.findById(animal._id.toString());
      expect(result.canRequest).toBe(false);
    });

    it('lanza NotFoundException para id inexistente', async () => {
      await expect(service.findById(new Types.ObjectId().toString())).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('buscar', () => {
    it('retorna solo animales disponibles de refugios verificados', async () => {
      const refugio = await crearRefugioVerificado();
      await animalModel.create([
        { ...baseAnimalDto, refugioId: refugio._id, estado: 'disponible' },
        { ...baseAnimalDto, nombre: 'Adoptado', refugioId: refugio._id, estado: 'adoptado' },
      ]);

      const result = await service.buscar({});

      expect(result.data).toHaveLength(1);
      expect(result.data[0].nombre).toBe('Firulais');
    });

    it('retorna lista vacía si no hay refugios verificados', async () => {
      await refugioModel.create({
        userId: new Types.ObjectId(),
        nombre: 'Sin verificar',
        descripcion: 'Desc',
        ciudad: 'Cali',
        direccion: 'Calle 2',
        telefono: '3009999999',
        estado: 'pendiente_verificacion',
      });

      const result = await service.buscar({});
      expect(result.data).toHaveLength(0);
    });

    it('filtra por ciudad del refugio', async () => {
      const refugioBogota = await crearRefugioVerificado();
      const refugioCali = await refugioModel.create({
        userId: new Types.ObjectId(),
        nombre: 'Refugio Cali',
        descripcion: 'Desc',
        ciudad: 'Cali',
        direccion: 'Calle 2',
        telefono: '3009999999',
        estado: 'verificado',
      });

      await animalModel.create([
        {
          ...baseAnimalDto,
          nombre: 'AnimalBogota',
          refugioId: refugioBogota._id,
          estado: 'disponible',
        },
        {
          ...baseAnimalDto,
          nombre: 'AnimalCali',
          refugioId: refugioCali._id,
          estado: 'disponible',
        },
      ]);

      const result = await service.buscar({ ciudad: 'Cali' });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].nombre).toBe('AnimalCali');
    });
  });

  describe('editar', () => {
    it('edita el animal si el usuario es propietario', async () => {
      const refugio = await crearRefugioVerificado();
      const animal = await animalModel.create({
        ...baseAnimalDto,
        refugioId: refugio._id,
        estado: 'disponible',
      });

      const updated = await service.editar(animal._id.toString(), userId.toString(), {
        nombre: 'Rex',
      });

      expect(updated.nombre).toBe('Rex');
    });

    it('lanza ForbiddenException si el usuario no es propietario', async () => {
      const refugio = await crearRefugioVerificado();
      const animal = await animalModel.create({
        ...baseAnimalDto,
        refugioId: refugio._id,
        estado: 'disponible',
      });

      await expect(
        service.editar(animal._id.toString(), new Types.ObjectId().toString(), { nombre: 'Rex' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('cambiarEstado', () => {
    it('cambia el estado del animal', async () => {
      const refugio = await crearRefugioVerificado();
      const animal = await animalModel.create({
        ...baseAnimalDto,
        refugioId: refugio._id,
        estado: 'disponible',
      });

      const updated = await service.cambiarEstado(
        animal._id.toString(),
        userId.toString(),
        'adoptado',
      );

      expect(updated.estado).toBe('adoptado');
    });
  });
});
