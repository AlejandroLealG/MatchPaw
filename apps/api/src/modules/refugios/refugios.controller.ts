import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { IRefugio } from '@matchpaw/shared';
import { JwtAuthGuard, Roles, RolesGuard } from '../../common/guards';
import { JwtPayload } from '../auth/auth.service';
import { RefugiosService, UpdateRefugioDto, RefugioMetricas } from './refugios.service';

type AuthRequest = Request & { user: JwtPayload };

@Controller('refugios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RefugiosController {
  constructor(private readonly refugiosService: RefugiosService) {}

  /** POST /refugios — Crear perfil de refugio (solo usuarios con rol refugio) */
  @Post()
  @Roles('refugio')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body()
    body: {
      nombre: string;
      descripcion: string;
      ciudad: string;
      direccion: string;
      telefono: string;
      fotoUrl?: string;
    },
    @Req() req: AuthRequest,
  ): Promise<IRefugio> {
    const refugio = await this.refugiosService.crearPerfil(req.user.sub, body);
    return this.refugiosService.toDto(refugio);
  }

  /** GET /refugios/me — Perfil del refugio del usuario autenticado */
  @Get('me')
  @Roles('refugio')
  @HttpCode(HttpStatus.OK)
  async findMe(@Req() req: AuthRequest): Promise<IRefugio> {
    const refugio = await this.refugiosService.findByUserId(req.user.sub);
    return this.refugiosService.toDto(refugio);
  }

  /** GET /refugios/:id — Perfil público del refugio */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<IRefugio> {
    const refugio = await this.refugiosService.findById(id);
    return this.refugiosService.toDto(refugio);
  }

  /** PUT /refugios/:id — Actualizar perfil (solo el refugio propietario) */
  @Put(':id')
  @Roles('refugio')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() body: UpdateRefugioDto,
    @Req() req: AuthRequest,
  ): Promise<IRefugio> {
    const updated = await this.refugiosService.editarPerfil(id, req.user.sub, body);
    return this.refugiosService.toDto(updated);
  }

  /**
   * GET /refugios/:id/animales
   * Placeholder — AnimalesModule proveerá la implementación real.
   * Este endpoint se completará cuando AnimalesModule esté disponible.
   */
  @Get(':id/animales')
  @HttpCode(HttpStatus.OK)
  async getAnimales(@Param('id') id: string): Promise<{ data: unknown[] }> {
    // Verificar que el refugio existe
    await this.refugiosService.findById(id);
    // AnimalesModule completará esta lógica en la tarea 6
    return { data: [] };
  }

  /**
   * GET /refugios/:id/donaciones
   * Placeholder — DonacionesModule proveerá la implementación real.
   * Solo accesible por el refugio propietario.
   */
  @Get(':id/donaciones')
  @Roles('refugio')
  @HttpCode(HttpStatus.OK)
  async getDonaciones(
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ): Promise<{ data: unknown[] }> {
    const refugio = await this.refugiosService.findById(id);
    if (refugio.userId.toString() !== req.user.sub) {
      const { ForbiddenException } = await import('@nestjs/common');
      throw new ForbiddenException({
        error: {
          code: 'FORBIDDEN',
          message: 'No tienes permisos para ver las donaciones de este refugio',
        },
      });
    }
    // DonacionesModule completará esta lógica en la tarea 9
    return { data: [] };
  }

  /** GET /refugios/:id/metricas — Métricas del panel (solo el refugio propietario) */
  @Get(':id/metricas')
  @Roles('refugio')
  @HttpCode(HttpStatus.OK)
  async getMetricas(@Param('id') id: string, @Req() req: AuthRequest): Promise<RefugioMetricas> {
    return this.refugiosService.obtenerMetricas(id, req.user.sub);
  }
}
