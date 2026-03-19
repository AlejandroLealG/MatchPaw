import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AnimalesController } from './animales.controller';
import { AnimalesService } from './animales.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

const mockAnimal = {
  _id: 'animal-id-1',
  nombre: 'Firulais',
  especie: 'perro',
  estado: 'disponible',
  refugio: { nombre: 'Refugio Test' },
  canRequest: true,
};

const mockPaginated = {
  data: [mockAnimal],
  total: 1,
  page: 1,
  limit: 10,
  totalPages: 1,
};

const animalesServiceMock = {
  buscar: jest.fn(),
  publicar: jest.fn(),
  findById: jest.fn(),
  editar: jest.fn(),
  cambiarEstado: jest.fn(),
};

function makeReq(userId = 'user-id-1') {
  return { user: { sub: userId, email: 'test@test.com', role: 'refugio' } };
}

describe('AnimalesController', () => {
  let controller: AnimalesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnimalesController],
      providers: [{ provide: AnimalesService, useValue: animalesServiceMock }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AnimalesController>(AnimalesController);
    jest.clearAllMocks();
  });

  // ── findAll ───────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('retorna lista paginada de animales', async () => {
      animalesServiceMock.buscar.mockResolvedValue(mockPaginated);

      const result = await controller.findAll({});

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(animalesServiceMock.buscar).toHaveBeenCalledWith({});
    });

    it('pasa filtros al servicio', async () => {
      animalesServiceMock.buscar.mockResolvedValue({ ...mockPaginated, data: [] });

      await controller.findAll({ especie: 'gato', ciudad: 'Bogotá' });

      expect(animalesServiceMock.buscar).toHaveBeenCalledWith({
        especie: 'gato',
        ciudad: 'Bogotá',
      });
    });
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('publica un animal y retorna el detalle', async () => {
      const docMock = { _id: 'animal-id-1' };
      animalesServiceMock.publicar.mockResolvedValue(docMock);
      animalesServiceMock.findById.mockResolvedValue(mockAnimal);

      const dto = {
        nombre: 'Firulais',
        especie: 'perro' as const,
        raza: 'Labrador',
        edadMeses: 12,
        sexo: 'macho' as const,
        tamano: 'mediano' as const,
        descripcion: 'Desc',
        estadoSalud: 'Sano',
        vacunado: true,
        esterilizado: false,
        fotos: [{ url: 'http://img.test/1.jpg', orden: 1 }],
      };

      const result = await controller.create(dto, makeReq() as never);

      expect(result.nombre).toBe('Firulais');
      expect(animalesServiceMock.publicar).toHaveBeenCalledWith('user-id-1', dto);
    });

    it('propaga ForbiddenException si el refugio no está verificado', async () => {
      animalesServiceMock.publicar.mockRejectedValue(new ForbiddenException());

      await expect(
        controller.create(
          {
            nombre: 'X',
            especie: 'perro',
            raza: 'X',
            edadMeses: 1,
            sexo: 'macho',
            tamano: 'pequeno',
            descripcion: 'X',
            estadoSalud: 'X',
            vacunado: false,
            esterilizado: false,
            fotos: [],
          },
          makeReq() as never,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('retorna el animal por id', async () => {
      animalesServiceMock.findById.mockResolvedValue(mockAnimal);

      const result = await controller.findOne('animal-id-1');

      expect(result._id).toBe('animal-id-1');
      expect(animalesServiceMock.findById).toHaveBeenCalledWith('animal-id-1');
    });

    it('propaga NotFoundException para id inexistente', async () => {
      animalesServiceMock.findById.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('edita el animal y retorna el detalle actualizado', async () => {
      const updated = { ...mockAnimal, nombre: 'Rex' };
      animalesServiceMock.editar.mockResolvedValue(undefined);
      animalesServiceMock.findById.mockResolvedValue(updated);

      const result = await controller.update('animal-id-1', { nombre: 'Rex' }, makeReq() as never);

      expect(result.nombre).toBe('Rex');
    });

    it('propaga ForbiddenException si el usuario no es propietario', async () => {
      animalesServiceMock.editar.mockRejectedValue(new ForbiddenException());

      await expect(
        controller.update('animal-id-1', { nombre: 'X' }, makeReq('otro-user') as never),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── updateEstado ──────────────────────────────────────────────────────────

  describe('updateEstado', () => {
    it('cambia el estado del animal', async () => {
      const updated = { ...mockAnimal, estado: 'adoptado', canRequest: false };
      animalesServiceMock.cambiarEstado.mockResolvedValue(undefined);
      animalesServiceMock.findById.mockResolvedValue(updated);

      const result = await controller.updateEstado(
        'animal-id-1',
        { estado: 'adoptado' },
        makeReq() as never,
      );

      expect(result.estado).toBe('adoptado');
    });
  });
});
