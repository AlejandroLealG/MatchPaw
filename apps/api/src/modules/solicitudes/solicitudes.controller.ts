import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { CreateSolicitudDto, UpdateSolicitudEstadoDto } from '@matchpaw/shared';
import { JwtAuthGuard, Roles, RolesGuard } from '../../common/guards';
import { JwtPayload } from '../auth/auth.service';
import {
  SolicitudesService,
  SolicitudDto,
  SolicitudesPorAnimal,
} from './solicitudes.service';

type AuthRequest = Request & { user: JwtPayload };

@Controller('solicitudes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SolicitudesController {
  constructor(private readonly solicitudesService: SolicitudesService) {}

  /** POST /solicitudes — Enviar solicitud de adopción (solo adoptante) */
  @Post()
  @Roles('adoptante')
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateSolicitudDto,
    @Req() req: AuthRequest,
  ): Promise<SolicitudDto> {
    const doc = await this.solicitudesService.enviar(req.user.sub, dto);
    return this.solicitudesService.toDto(doc);
  }

  /** GET /solicitudes/mis-solicitudes — Historial del adoptante */
  @Get('mis-solicitudes')
  @Roles('adoptante')
  @HttpCode(HttpStatus.OK)
  async misSolicitudes(@Req() req: AuthRequest): Promise<SolicitudDto[]> {
    return this.solicitudesService.historialAdoptante(req.user.sub);
  }

  /** GET /solicitudes/refugio — Solicitudes recibidas agrupadas por animal (solo refugio) */
  @Get('refugio')
  @Roles('refugio')
  @HttpCode(HttpStatus.OK)
  async solicitudesRefugio(
    @Req() req: AuthRequest,
  ): Promise<SolicitudesPorAnimal[]> {
    return this.solicitudesService.historialRefugio(req.user.sub);
  }

  /** PATCH /solicitudes/:id — Cambiar estado (solo refugio propietario del animal) */
  @Patch(':id')
  @Roles('refugio')
  @HttpCode(HttpStatus.OK)
  async updateEstado(
    @Param('id') id: string,
    @Body() dto: UpdateSolicitudEstadoDto,
    @Req() req: AuthRequest,
  ): Promise<SolicitudDto> {
    const doc = await this.solicitudesService.cambiarEstado(
      id,
      req.user.sub,
      dto,
    );
    return this.solicitudesService.toDto(doc);
  }
}
