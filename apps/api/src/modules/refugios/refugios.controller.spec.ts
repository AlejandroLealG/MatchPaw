import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RefugiosController } from './refugios.controller';
import { RefugiosService } from './refugios.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

const mockRefugioDoc = {
  _id: { toString: () => 'refugio-id-1' },
  userId: { toString: () => 'user-id-1' },
  nombre: 'Refugio Test',
  descripcion: 'Desc',
  ciudad: 'Bogotá',
  direccion: 'Calle 1',
  telefono: '3001234567',
  estado: 'verificado',
  motivoRechazo: null,
};

const mockRefugioDto = {
  _id: 'refugio-id-1',
  userId: 'user-id-1',
  nombre: 'Refugio Test',
  descripcion: 'Desc',
  ciudad: 'Bogotá',
  direccion: 'Calle 1',
  telefono: '3001234567',
  estado: 'verificado' as const,
};

const mockMetricas = {
  totalAnimales: 5,
  solicitudesPendientes: 2,
  solicitudesAprobadas: 1,
  donacionesDelMes: 3,
};

const refugiosServiceMock = {
  findById: jest.fn(),
  editarPerfil: jest.fn(),
  obtenerMetricas: jest.fn(),
  toDto: jest.fn(),
};

function makeReq(userId = 'user-id-1') {
  return { user: { sub: userId, email: 'test@test.com', role: 'refugio' } };
}

describe('RefugiosController', () => {
  let controller: RefugiosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RefugiosController],
      providers: [{ provide: RefugiosService, useValue: refugiosServiceMock }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RefugiosController>(RefugiosController);
    jest.clearAllMocks();
  });

  // ── findOne ───────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('retorna el perfil del refugio', async () => {
      refugiosServiceMock.findById.mockResolvedValue(mockRefugioDoc);
      refugiosServiceMock.toDto.mockReturnValue(mockRefugioDto);

      const result = await controller.findOne('refugio-id-1');

      expect(result._id).toBe('refugio-id-1');
      expect(refugiosServiceMock.findById).toHaveBeenCalledWith('refugio-id-1');
    });

    it('propaga NotFoundException para id inexistente', async () => {
      refugiosServiceMock.findById.mockRejectedValue(new NotFoundException());

      await expect(controller.findOne('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('actualiza el perfil del refugio', async () => {
      const updatedDoc = { ...mockRefugioDoc, nombre: 'Nuevo Nombre' };
      const updatedDto = { ...mockRefugioDto, nombre: 'Nuevo Nombre' };
      refugiosServiceMock.editarPerfil.mockResolvedValue(updatedDoc);
      refugiosServiceMock.toDto.mockReturnValue(updatedDto);

      const result = await controller.update(
        'refugio-id-1',
        { nombre: 'Nuevo Nombre' },
        makeReq() as never,
      );

      expect(result.nombre).toBe('Nuevo Nombre');
      expect(refugiosServiceMock.editarPerfil).toHaveBeenCalledWith('refugio-id-1', 'user-id-1', {
        nombre: 'Nuevo Nombre',
      });
    });

    it('propaga ForbiddenException si el usuario no es propietario', async () => {
      refugiosServiceMock.editarPerfil.mockRejectedValue(new ForbiddenException());

      await expect(
        controller.update('refugio-id-1', { nombre: 'X' }, makeReq('otro') as never),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── getAnimales ───────────────────────────────────────────────────────────

  describe('getAnimales', () => {
    it('retorna lista vacía (placeholder)', async () => {
      refugiosServiceMock.findById.mockResolvedValue(mockRefugioDoc);

      const result = await controller.getAnimales('refugio-id-1');

      expect(result.data).toHaveLength(0);
    });

    it('propaga NotFoundException si el refugio no existe', async () => {
      refugiosServiceMock.findById.mockRejectedValue(new NotFoundException());

      await expect(controller.getAnimales('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── getDonaciones ─────────────────────────────────────────────────────────

  describe('getDonaciones', () => {
    it('retorna lista vacía para el propietario', async () => {
      refugiosServiceMock.findById.mockResolvedValue(mockRefugioDoc);

      const result = await controller.getDonaciones('refugio-id-1', makeReq('user-id-1') as never);

      expect(result.data).toHaveLength(0);
    });

    it('lanza ForbiddenException si el usuario no es propietario', async () => {
      refugiosServiceMock.findById.mockResolvedValue(mockRefugioDoc);

      await expect(
        controller.getDonaciones('refugio-id-1', makeReq('otro-user') as never),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ── getMetricas ───────────────────────────────────────────────────────────

  describe('getMetricas', () => {
    it('retorna las métricas del refugio', async () => {
      refugiosServiceMock.obtenerMetricas.mockResolvedValue(mockMetricas);

      const result = await controller.getMetricas('refugio-id-1', makeReq() as never);

      expect(result.totalAnimales).toBe(5);
      expect(result.solicitudesPendientes).toBe(2);
      expect(refugiosServiceMock.obtenerMetricas).toHaveBeenCalledWith('refugio-id-1', 'user-id-1');
    });

    it('propaga ForbiddenException si el usuario no es propietario', async () => {
      refugiosServiceMock.obtenerMetricas.mockRejectedValue(new ForbiddenException());

      await expect(
        controller.getMetricas('refugio-id-1', makeReq('otro') as never),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
