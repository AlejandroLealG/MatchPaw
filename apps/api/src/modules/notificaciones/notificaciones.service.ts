import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import {
  NotificacionesRepository,
  CreateNotificacionDto,
  SavePushSubscriptionDto,
} from './notificaciones.repository';
import { NotificacionDocument, NotificacionTipo } from './schemas/notificacion.schema';
import { PushSubscriptionDocument } from './schemas/push-subscription.schema';

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(
    private readonly repo: NotificacionesRepository,
    private readonly config: ConfigService,
  ) {
    const vapidPublic = this.config.get<string>('VAPID_PUBLIC_KEY', '');
    const vapidPrivate = this.config.get<string>('VAPID_PRIVATE_KEY', '');
    const vapidSubject = this.config.get<string>('VAPID_SUBJECT', 'mailto:admin@matchpaw.co');

    if (vapidPublic && vapidPrivate) {
      webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
    }
  }

  // ── Crear notificación en DB y enviar push ────────────────────────────────

  async crear(data: CreateNotificacionDto): Promise<NotificacionDocument> {
    const notificacion = await this.repo.create(data);

    // Enviar push en background — no bloquear la respuesta
    this.enviarPush(data.userId, data.titulo, data.cuerpo).catch((err) =>
      this.logger.warn(`Push fallido para userId=${data.userId}: ${err.message}`),
    );

    return notificacion;
  }

  // ── Listar notificaciones del usuario ─────────────────────────────────────

  async findByUser(userId: string): Promise<NotificacionDocument[]> {
    return this.repo.findByUser(userId);
  }

  // ── Marcar como leída ─────────────────────────────────────────────────────

  async markAsRead(id: string, userId: string): Promise<NotificacionDocument> {
    const updated = await this.repo.markAsRead(id, userId);
    if (!updated) {
      throw new NotFoundException({
        error: { code: 'NOTIFICACION_NOT_FOUND', message: 'Notificación no encontrada' },
      });
    }
    return updated;
  }

  // ── Suscripciones push ────────────────────────────────────────────────────

  async suscribir(data: SavePushSubscriptionDto): Promise<PushSubscriptionDocument> {
    return this.repo.savePushSubscription(data);
  }

  async desuscribir(endpoint: string, userId: string): Promise<void> {
    await this.repo.deletePushSubscription(endpoint, userId);
  }

  // ── Envío de push a todas las suscripciones del usuario ──────────────────

  async enviarPush(userId: string, titulo: string, cuerpo: string): Promise<void> {
    const suscripciones = await this.repo.findPushSubscriptionsByUser(userId);
    if (suscripciones.length === 0) return;

    const payload = JSON.stringify({ titulo, cuerpo });

    await Promise.allSettled(
      suscripciones.map((sub) =>
        webpush
          .sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          )
          .catch(async (err: { statusCode?: number }) => {
            // 410 Gone = suscripción expirada, eliminar
            if (err.statusCode === 410) {
              await this.repo.deletePushSubscription(sub.endpoint, userId);
            }
            throw err;
          }),
      ),
    );
  }

  // ── Helper para otros módulos (SolicitudesService, DonacionesService) ─────

  async crearParaTipo(
    userId: string,
    tipo: NotificacionTipo,
    titulo: string,
    cuerpo: string,
  ): Promise<void> {
    await this.crear({ userId, tipo, titulo, cuerpo });
  }
}
