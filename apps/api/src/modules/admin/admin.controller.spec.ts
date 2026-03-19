import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

const adminServiceMock = {
  listarRefugios: jest.fn(),
  verificarRefugio: jest.fn(),
  listarUsuarios: jest.fn(),
  cambiarEstadoUsuario: jest.fn(),
  listarDonaciones: jest.fn(),
};

describe('AdminController', () => {
  let controller: AdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [{ provide: AdminService, useValue: adminServiceMock }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminController>(AdminController);
    jest.clearAllMocks();
  });

  // ── listarRefugios ────────────────────────────────────────────────────────

  describe('listarRefugios', () => {
    it('lista refugios sin filtro', async () => {
      adminServiceMock.listarRefugios.mockResolvedValue([]);

      const result = await controller.listarRefugios();

      expect(adminServiceMock.listarRefugios).toHaveBeenCalledWith(undefined);
      expect(result).toEqual([]);
    });

    it('lista refugios filtrados por estado', async () => {
      const pendientes = [{ estado: 'pendiente_verificacion' }];
      adminServiceMock.listarRefugios.mockResolvedValue(pendientes);

      const result = await controller.listarRefugios('pendiente_verificacion');

      expect(adminServiceMock.listarRefugios).toHaveBeenCalledWith('pendiente_verificacion');
      expect(result).toHaveLength(1);
    });
  });

  // ── verificarRefugio ──────────────────────────────────────────────────────

  describe('verificarRefugio', () => {
    it('aprueba un refugio', async () => {
      const updated = { estado: 'verificado' };
      adminServiceMock.verificarRefugio.mockResolvedValue(updated);

      const result = await controller.verificarRefugio('refugio-id', {
        accion: 'aprobar',
      });

      expect(result.estado).toBe('verificado');
      expect(adminServiceMock.verificarRefugio).toHaveBeenCalledWith(
        'refugio-id',
        'aprobar',
        undefined,
      );
    });

    it('rechaza un refugio con motivo', async () => {
      const updated = { estado: 'rechazado', motivoRechazo: 'Docs incompletos' };
      adminServiceMock.verificarRefugio.mockResolvedValue(updated);

      const result = await controller.verificarRefugio('refugio-id', {
        accion: 'rechazar',
        motivo: 'Docs incompletos',
      });

      expect(result.estado).toBe('rechazado');
    });

    it('propaga BadRequestException si se rechaza sin motivo', async () => {
      adminServiceMock.verificarRefugio.mockRejectedValue(new BadRequestException());

      await expect(
        controller.verificarRefugio('refugio-id', { accion: 'rechazar' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('propaga NotFoundException si el refugio no existe', async () => {
      adminServiceMock.verificarRefugio.mockRejectedValue(new NotFoundException());

      await expect(controller.verificarRefugio('bad-id', { accion: 'aprobar' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── listarUsuarios ────────────────────────────────────────────────────────

  describe('listarUsuarios', () => {
    it('lista usuarios con paginación por defecto', async () => {
      const paginated = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      adminServiceMock.listarUsuarios.mockResolvedValue(paginated);

      const result = await controller.listarUsuarios();

      expect(adminServiceMock.listarUsuarios).toHaveBeenCalledWith(1, 20);
      expect(result.page).toBe(1);
    });

    it('parsea page y limit como números', async () => {
      const paginated = { data: [], total: 0, page: 2, limit: 5, totalPages: 0 };
      adminServiceMock.listarUsuarios.mockResolvedValue(paginated);

      await controller.listarUsuarios('2', '5');

      expect(adminServiceMock.listarUsuarios).toHaveBeenCalledWith(2, 5);
    });
  });

  // ── cambiarEstadoUsuario ──────────────────────────────────────────────────

  describe('cambiarEstadoUsuario', () => {
    it('suspende un usuario', async () => {
      const updated = { activo: false };
      adminServiceMock.cambiarEstadoUsuario.mockResolvedValue(updated);

      const result = await controller.cambiarEstadoUsuario('user-id', {
        accion: 'suspender',
      });

      expect(result.activo).toBe(false);
    });

    it('activa un usuario', async () => {
      const updated = { activo: true };
      adminServiceMock.cambiarEstadoUsuario.mockResolvedValue(updated);

      const result = await controller.cambiarEstadoUsuario('user-id', {
        accion: 'activar',
      });

      expect(result.activo).toBe(true);
    });

    it('propaga NotFoundException para id inválido', async () => {
      adminServiceMock.cambiarEstadoUsuario.mockRejectedValue(new NotFoundException());

      await expect(
        controller.cambiarEstadoUsuario('bad-id', { accion: 'suspender' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── listarDonaciones ──────────────────────────────────────────────────────

  describe('listarDonaciones', () => {
    it('lista donaciones con paginación por defecto', async () => {
      const paginated = { data: [], total: 0, page: 1, limit: 20, totalPages: 0 };
      adminServiceMock.listarDonaciones.mockResolvedValue(paginated);

      const result = await controller.listarDonaciones();

      expect(adminServiceMock.listarDonaciones).toHaveBeenCalledWith(1, 20);
      expect(result.total).toBe(0);
    });
  });
});
