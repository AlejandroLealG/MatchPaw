import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/auth.service';
import { NotificacionesService } from './notificaciones.service';

export interface PushSubscribeDto {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushUnsubscribeDto {
  endpoint: string;
}

@Controller('notificaciones')
@UseGuards(JwtAuthGuard)
export class NotificacionesController {
  constructor(private readonly service: NotificacionesService) {}

  // GET /notificaciones — listar notificaciones del usuario autenticado
  @Get()
  async listar(@Request() req: ExpressRequest & { user: JwtPayload }) {
    return this.service.findByUser(req.user.sub);
  }

  // PATCH /notificaciones/:id/leida — marcar una notificación como leída
  @Patch(':id/leida')
  async marcarLeida(
    @Param('id') id: string,
    @Request() req: ExpressRequest & { user: JwtPayload },
  ) {
    return this.service.markAsRead(id, req.user.sub);
  }

  // POST /notificaciones/push/subscribe — registrar suscripción push del dispositivo
  @Post('push/subscribe')
  @HttpCode(201)
  async suscribir(
    @Body() dto: PushSubscribeDto,
    @Request() req: ExpressRequest & { user: JwtPayload },
  ) {
    return this.service.suscribir({
      userId: req.user.sub,
      endpoint: dto.endpoint,
      p256dh: dto.p256dh,
      auth: dto.auth,
    });
  }

  // DELETE /notificaciones/push/subscribe — cancelar suscripción push
  @Delete('push/subscribe')
  @HttpCode(204)
  async desuscribir(
    @Body() dto: PushUnsubscribeDto,
    @Request() req: ExpressRequest & { user: JwtPayload },
  ) {
    await this.service.desuscribir(dto.endpoint, req.user.sub);
  }
}
