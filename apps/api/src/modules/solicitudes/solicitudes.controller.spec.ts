import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SolicitudesController } from './solicitudes.controller';
import { SolicitudesService } from './solicitudes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

const mockSolicitudDto = {
  _id: 'sol-id-1',
  animalId: 'animal-id-1',
  adoptanteId: 'user-id-1',
  estado: 'pendiente',
  descripcionHogar: 'Casa con jardín',
};

const solicitudesServiceMock = {
  enviar: jest.fn(),
  toDto: jest.fn(),
  historialAdoptante: jest.fn(),
  historialRefugio: jest.fn(),
  cambiarEstado: jest.fn(),
};

function makeReq(userId = 'user-id-1', role = 'adoptante') {
  return { user: { sub: userId, email: 'test@test.com', role } };
}

describe('SolicitudesController', () => {
  let controller: SolicitudesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SolicitudesController],
      providers: [{ provide: SolicitudesService, useValue: solicitudesServiceMock }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SolicitudesController>(SolicitudesController);
    jest.clearAllMocks();
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('crea una solicitud y retorna el DTO', async () => {
      const docMock = { _id: 'sol-id-1', estado: 'pendiente' };
      solicitudesServiceMock.enviar.mockResolvedValue(docMock);
      solicitudesServiceMock.toDto.mockReturnValue(mockSolicitudDto);

      const result = await controller.create(
        { animalId: 'animal-id-1', descripcionHogar: 'Casa con jardín' },
        makeReq() as never,
      );

      expect(result.estado).toBe('pendiente');
      expect(solicitudesServiceMock.enviar).toHaveBeenCalledWith('user-id-1', {
        animalId: 'animal-id-1',
        descripcionHogar: 'Casa con jardín',
      });
    });

    it('propaga ConflictException si ya existe solicitud activa', async () => {
      solicitudesServiceMock.enviar.mockRejectedValue(new ConflictException());

      await expect(
        controller.create({ animalId: 'animal-id-1' }, makeReq() as never),
      ).rejects.toThrow(ConflictException);
    });

    it('propaga NotFoundException si el animal no existe', async () => {
      solicitudesServiceMock.enviar.mockRejectedValue(new NotFoundException());

      await expect(controller.create({ animalId: 'bad-id' }, makeReq() as never)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── misSolicitudes ────────────────────────────────────────────────────────

  describe('misSolicitudes', () => {
    it('retorna el historial del adoptante', async () => {
      solicitudesServiceMock.historialAdoptante.mockResolvedValue([mockSolicitudDto]);

      const result = await controller.misSolicitudes(makeReq() as never);

      expect(result).toHaveLength(1);
      expect(solicitudesServiceMock.historialAdoptante).toHaveBeenCalledWith('user-id-1');
    });

    it('retorna lista vacía si no hay solicitudes', async () => {
      solicitudesServiceMock.historialAdoptante.mockResolvedValue([]);

      const result = await controller.misSolicitudes(makeReq() as never);

      expect(result).toHaveLength(0);
    });
  });

  // ── solicitudesRefugio ────────────────────────────────────────────────────

  describe('solicitudesRefugio', () => {
    it('retorna solicitudes agrupadas por animal', async () => {
      const grouped = [
        {
          animalId: 'animal-id-1',
          animalNombre: 'Firulais',
          solicitudes: [mockSolicitudDto],
        },
      ];
      solicitudesServiceMock.historialRefugio.mockResolvedValue(grouped);

      const result = await controller.solicitudesRefugio(
        makeReq('refugio-user', 'refugio') as never,
      );

      expect(result).toHaveLength(1);
      expect(result[0].solicitudes).toHaveLength(1);
    });

    it('propaga NotFoundException si el refugio no existe', async () => {
      solicitudesServiceMock.historialRefugio.mockRejectedValue(new NotFoundException());

      await expect(
        controller.solicitudesRefugio(makeReq('refugio-user', 'refugio') as never),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── updateEstado ──────────────────────────────────────────────────────────

  describe('updateEstado', () => {
    it('aprueba una solicitud', async () => {
      const approved = { ...mockSolicitudDto, estado: 'aprobada' };
      solicitudesServiceMock.cambiarEstado.mockResolvedValue({
        _id: 'sol-id-1',
        estado: 'aprobada',
      });
      solicitudesServiceMock.toDto.mockReturnValue(approved);

      const result = await controller.updateEstado(
        'sol-id-1',
        { estado: 'aprobada' },
        makeReq('refugio-user', 'refugio') as never,
      );

      expect(result.estado).toBe('aprobada');
    });

    it('propaga ForbiddenException si el usuario no es propietario del refugio', async () => {
      solicitudesServiceMock.cambiarEstado.mockRejectedValue(new ForbiddenException());

      await expect(
        controller.updateEstado(
          'sol-id-1',
          { estado: 'aprobada' },
          makeReq('otro-user', 'refugio') as never,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('propaga ConflictException si la solicitud ya fue procesada', async () => {
      solicitudesServiceMock.cambiarEstado.mockRejectedValue(new ConflictException());

      await expect(
        controller.updateEstado(
          'sol-id-1',
          { estado: 'rechazada' },
          makeReq('refugio-user', 'refugio') as never,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });
});
