import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../auth/auth.service';

export type NotificacionEventTipo =
  | 'nueva_solicitud'
  | 'cambio_estado_solicitud'
  | 'donacion_recibida';

export interface NotificacionEvent {
  tipo: NotificacionEventTipo;
  titulo: string;
  cuerpo: string;
  createdAt: Date;
}

/**
 * Gateway Socket.IO para notificaciones en tiempo real.
 * Cada usuario autenticado se une a una sala privada con su userId.
 * Los eventos se emiten a esa sala para que solo el usuario afectado los reciba.
 * Requisito 8.2
 */
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/notificaciones',
})
export class NotificacionesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificacionesGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ── Conexión ──────────────────────────────────────────────────────────────

  handleConnection(client: Socket): void {
    const userId = this.extractUserId(client);
    if (!userId) {
      this.logger.warn(`Cliente ${client.id} rechazado: token inválido`);
      client.disconnect(true);
      return;
    }

    // Unir al usuario a su sala privada
    void client.join(userId);
    this.logger.log(`Cliente ${client.id} conectado → sala ${userId}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Cliente ${client.id} desconectado`);
  }

  // ── Emitir evento a un usuario específico ─────────────────────────────────

  emitirAUsuario(userId: string, evento: NotificacionEvent): void {
    this.server.to(userId).emit(evento.tipo, evento);
    this.logger.log(`Evento "${evento.tipo}" emitido a sala ${userId}`);
  }

  // ── Helper: extraer userId del JWT en el handshake ────────────────────────

  private extractUserId(client: Socket): string | null {
    const token =
      (client.handshake.auth as { token?: string }).token ??
      (client.handshake.headers.authorization as string | undefined)?.replace('Bearer ', '');

    if (!token) return null;

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });
      return payload.sub;
    } catch {
      return null;
    }
  }
}
