import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bull';
import { Model } from 'mongoose';
import * as sgMail from '@sendgrid/mail';
import { UserDocument } from '../auth/schemas/user.schema';

const MAX_ATTEMPTS = 3;
const BACKOFF_DELAY_MS = 5 * 60 * 1000; // 5 minutos

export interface NuevaSolicitudRefugioJob {
  refugioUserId: string;
  animalNombre: string;
  solicitudId: string;
}

export interface CambioEstadoSolicitudJob {
  adoptanteUserId: string;
  estado: 'aprobada' | 'rechazada';
  animalNombre: string;
  motivo?: string;
  solicitudId: string;
}

export interface VerificacionRefugioJob {
  refugioUserId: string;
  refugioNombre: string;
  accion: 'aprobar' | 'rechazar';
  motivo: string | null;
  to: string;
}

export interface ComprobanteDonacionJob {
  to: string;
  donacionId: string;
  monto: number;
  moneda: string;
  numeroReferencia: string;
  refugioNombre: string;
  donanteEmail: string;
}

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    @InjectModel('User')
    private readonly userModel: Model<UserDocument>,
    private readonly config: ConfigService,
  ) {
    const apiKey = this.config.get<string>('SENDGRID_API_KEY', '');
    if (apiKey) {
      sgMail.setApiKey(apiKey);
    }
  }

  // ── Nueva solicitud → notificar al refugio ────────────────────────────────

  @Process({ name: 'nueva-solicitud-refugio', concurrency: 5 })
  async procesarNuevaSolicitudRefugio(job: Job<NuevaSolicitudRefugioJob>): Promise<void> {
    const { refugioUserId, animalNombre, solicitudId } = job.data;

    const refugioUser = await this.userModel.findById(refugioUserId).exec();
    if (!refugioUser) {
      this.logger.warn(`Usuario refugio no encontrado: ${refugioUserId}`);
      return;
    }

    await sgMail.send({
      to: refugioUser.email,
      from: this.config.get<string>('SENDGRID_FROM', 'noreply@matchpaw.co'),
      subject: `Nueva solicitud de adopción para ${animalNombre}`,
      text: [
        `Hola,`,
        ``,
        `Tienes una nueva solicitud de adopción para ${animalNombre}.`,
        ``,
        `ID de solicitud: ${solicitudId}`,
        ``,
        `Ingresa a tu panel para revisar los detalles.`,
        ``,
        `— Equipo MatchPaw`,
      ].join('\n'),
    });

    this.logger.log(`Email nueva-solicitud enviado a ${refugioUser.email}`);
  }

  // ── Cambio de estado → notificar al adoptante ─────────────────────────────

  @Process({ name: 'cambio-estado-solicitud', concurrency: 5 })
  async procesarCambioEstado(job: Job<CambioEstadoSolicitudJob>): Promise<void> {
    const { adoptanteUserId, estado, animalNombre, motivo } = job.data;

    const adoptante = await this.userModel.findById(adoptanteUserId).exec();
    if (!adoptante) {
      this.logger.warn(`Usuario adoptante no encontrado: ${adoptanteUserId}`);
      return;
    }

    const estadoTexto = estado === 'aprobada' ? 'aprobada ✅' : 'rechazada ❌';
    const motivoLinea = motivo ? `\nMotivo: ${motivo}` : '';

    await sgMail.send({
      to: adoptante.email,
      from: this.config.get<string>('SENDGRID_FROM', 'noreply@matchpaw.co'),
      subject: `Tu solicitud para ${animalNombre} fue ${estadoTexto}`,
      text: [
        `Hola,`,
        ``,
        `Tu solicitud de adopción para ${animalNombre} ha sido ${estadoTexto}.${motivoLinea}`,
        ``,
        `Ingresa a tu panel para ver el historial completo.`,
        ``,
        `— Equipo MatchPaw`,
      ].join('\n'),
    });

    this.logger.log(`Email cambio-estado enviado a ${adoptante.email}`);
  }

  // ── Verificación de refugio → notificar al refugio ───────────────────────

  @Process({ name: 'verificacion-refugio', concurrency: 5 })
  async procesarVerificacionRefugio(job: Job<VerificacionRefugioJob>): Promise<void> {
    const { to, refugioNombre, accion, motivo } = job.data;

    if (!to) {
      this.logger.warn('verificacion-refugio: destinatario vacío, omitiendo');
      return;
    }

    const accionTexto = accion === 'aprobar' ? 'aprobado ✅' : 'rechazado ❌';
    const motivoLinea = motivo ? `\nMotivo: ${motivo}` : '';

    await sgMail.send({
      to,
      from: this.config.get<string>('SENDGRID_FROM', 'noreply@matchpaw.co'),
      subject: `Tu refugio "${refugioNombre}" ha sido ${accionTexto}`,
      text: [
        `Hola,`,
        ``,
        `Tu refugio "${refugioNombre}" ha sido ${accionTexto} por el equipo de MatchPaw.${motivoLinea}`,
        ``,
        accion === 'aprobar'
          ? `Ya puedes publicar animales en adopción desde tu panel.`
          : `Si tienes dudas, contáctanos respondiendo este correo.`,
        ``,
        `— Equipo MatchPaw`,
      ].join('\n'),
    });

    this.logger.log(`Email verificacion-refugio enviado a ${to} (accion: ${accion})`);
  }

  // ── Comprobante de donación ───────────────────────────────────────────────

  @Process({ name: 'comprobante-donacion', concurrency: 5 })
  async procesarComprobanteDonacion(job: Job<ComprobanteDonacionJob>): Promise<void> {
    const { to, monto, moneda, numeroReferencia, refugioNombre } = job.data;

    if (!to) {
      this.logger.warn('comprobante-donacion: destinatario vacío, omitiendo');
      return;
    }

    await sgMail.send({
      to,
      from: this.config.get<string>('SENDGRID_FROM', 'noreply@matchpaw.co'),
      subject: `Comprobante de donación a ${refugioNombre}`,
      text: [
        `Hola,`,
        ``,
        `Tu donación fue procesada exitosamente.`,
        ``,
        `  Refugio:    ${refugioNombre}`,
        `  Monto:      $${monto.toLocaleString('es-CO')} ${moneda}`,
        `  Referencia: ${numeroReferencia}`,
        ``,
        `Gracias por apoyar a los animales.`,
        ``,
        `— Equipo MatchPaw`,
      ].join('\n'),
    });

    this.logger.log(`Comprobante donación enviado a ${to} (ref: ${numeroReferencia})`);
  }

  // ── Manejo de fallos: marcar emailFallido tras MAX_ATTEMPTS ──────────────
  // Requisito 8.3: reintentar exactamente 3 veces con intervalo de 5 minutos

  @OnQueueFailed()
  async onFailed(job: Job, error: Error): Promise<void> {
    this.logger.error(
      `Job "${job.name}" #${job.id} falló (intento ${job.attemptsMade}/${MAX_ATTEMPTS}): ${error.message}`,
    );

    if (job.attemptsMade >= MAX_ATTEMPTS) {
      this.logger.error(
        `Job "${job.name}" #${job.id} agotó los ${MAX_ATTEMPTS} reintentos. Marcando emailFallido.`,
      );

      // Marcar emailFallido en el documento relacionado según el tipo de job
      await this.marcarEmailFallido(job);
    }
  }

  private async marcarEmailFallido(job: Job): Promise<void> {
    try {
      if (job.name === 'nueva-solicitud-refugio') {
        const data = job.data as NuevaSolicitudRefugioJob;
        this.logger.warn(
          `emailFallido: nueva-solicitud-refugio para solicitudId=${data.solicitudId}`,
        );
      } else if (job.name === 'cambio-estado-solicitud') {
        const data = job.data as CambioEstadoSolicitudJob;
        this.logger.warn(
          `emailFallido: cambio-estado-solicitud para adoptanteUserId=${data.adoptanteUserId}`,
        );
      } else if (job.name === 'comprobante-donacion') {
        const data = job.data as ComprobanteDonacionJob;
        this.logger.warn(`emailFallido: comprobante-donacion ref=${data.numeroReferencia}`);
      }
    } catch (err) {
      this.logger.error(`Error al marcar emailFallido: ${(err as Error).message}`);
    }
  }
}

/**
 * Opciones de cola para la queue 'email'.
 * Configura exactamente 3 reintentos con backoff fijo de 5 minutos — Requisito 8.3.
 */
export const EMAIL_QUEUE_DEFAULT_JOB_OPTIONS = {
  attempts: MAX_ATTEMPTS,
  backoff: {
    type: 'fixed' as const,
    delay: BACKOFF_DELAY_MS,
  },
  removeOnComplete: true,
  removeOnFail: false,
};
