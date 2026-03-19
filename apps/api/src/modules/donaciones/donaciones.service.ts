import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import { Queue } from 'bull';
import { randomBytes } from 'crypto';
import Stripe from 'stripe';
import { CreateDonacionDto, CreateSuscripcionDto } from '@matchpaw/shared';
import { DonacionesRepository, PaginatedDonaciones } from './donaciones.repository';
import { DonacionDocument } from './schemas/donacion.schema';
import { SuscripcionDonacionDocument } from './schemas/suscripcion-donacion.schema';
import { RefugioDocument } from '../refugios/schemas/refugio.schema';
import { UserDocument } from '../auth/schemas/user.schema';
import { Notificacion, NotificacionDocument } from '../notificaciones/schemas/notificacion.schema';

@Injectable()
export class DonacionesService {
  private readonly stripe: Stripe;

  constructor(
    private readonly repo: DonacionesRepository,
    @InjectModel('Refugio')
    private readonly refugioModel: Model<RefugioDocument>,
    @InjectModel('User')
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Notificacion.name)
    private readonly notificacionModel: Model<NotificacionDocument>,
    @InjectQueue('email')
    private readonly emailQueue: Queue,
    private readonly configService: ConfigService,
  ) {
    this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY', ''), {
      apiVersion: '2023-10-16',
    });
  }

  // ── Crear PaymentIntent ───────────────────────────────────────────────────

  async crearPaymentIntent(
    donanteId: string,
    dto: CreateDonacionDto,
  ): Promise<{ clientSecret: string; donacionId: string; numeroReferencia: string }> {
    const refugio = await this.refugioModel.findById(dto.refugioId).exec();
    if (!refugio) {
      throw new NotFoundException({
        error: { code: 'REFUGIO_NOT_FOUND', message: 'Refugio no encontrado' },
      });
    }
    if (refugio.estado !== 'verificado') {
      throw new BadRequestException({
        error: {
          code: 'REFUGIO_NOT_VERIFIED',
          message: 'El refugio no está verificado para recibir donaciones',
        },
      });
    }

    // COP es zero-decimal: amount = pesos enteros
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: dto.monto,
      currency: 'cop',
      metadata: { refugioId: dto.refugioId, donanteId },
    });

    const numeroReferencia =
      'MP-' + Date.now() + '-' + randomBytes(4).toString('hex').toUpperCase();

    const donacion = await this.repo.create({
      refugioId: new Types.ObjectId(dto.refugioId),
      donanteId: new Types.ObjectId(donanteId),
      monto: dto.monto,
      moneda: 'COP',
      stripePaymentIntentId: paymentIntent.id,
      numeroReferencia,
      estado: 'pendiente',
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      donacionId: donacion._id.toString(),
      numeroReferencia,
    };
  }

  // ── Procesar Webhook ──────────────────────────────────────────────────────

  async procesarWebhook(rawBody: Buffer, signature: string): Promise<{ received: boolean }> {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET', '');

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      throw new BadRequestException({
        error: { code: 'INVALID_WEBHOOK', message: 'Firma de webhook inválida' },
      });
    }

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as Stripe.PaymentIntent;
      const donacion = await this.repo.findByStripePaymentIntentId(pi.id);
      if (donacion) {
        await this.repo.updateEstado(donacion._id.toString(), 'completada');

        const refugio = await this.refugioModel.findById(donacion.refugioId).exec();
        const donante = await this.userModel.findById(donacion.donanteId).exec();

        // Encolar email de comprobante
        await this.emailQueue.add('comprobante-donacion', {
          to: donante?.email,
          donacionId: donacion._id.toString(),
          monto: donacion.monto,
          moneda: donacion.moneda,
          numeroReferencia: donacion.numeroReferencia,
          refugioNombre: refugio?.nombre,
          donanteEmail: donante?.email,
        });

        // Crear notificación para el refugio
        if (refugio) {
          await this.notificacionModel.create({
            userId: refugio.userId,
            tipo: 'donacion_recibida',
            titulo: 'Nueva donación recibida',
            cuerpo: `Recibiste una donación de $${donacion.monto} COP`,
            leida: false,
          });
        }
      }
    } else if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object as Stripe.PaymentIntent;
      const donacion = await this.repo.findByStripePaymentIntentId(pi.id);
      if (donacion) {
        await this.repo.updateEstado(donacion._id.toString(), 'fallida');
      }
    }

    return { received: true };
  }

  // ── Crear Suscripción ─────────────────────────────────────────────────────

  async crearSuscripcion(
    donanteId: string,
    dto: CreateSuscripcionDto,
  ): Promise<SuscripcionDonacionDocument> {
    const refugio = await this.refugioModel.findById(dto.refugioId).exec();
    if (!refugio) {
      throw new NotFoundException({
        error: { code: 'REFUGIO_NOT_FOUND', message: 'Refugio no encontrado' },
      });
    }
    if (refugio.estado !== 'verificado') {
      throw new BadRequestException({
        error: {
          code: 'REFUGIO_NOT_VERIFIED',
          message: 'El refugio no está verificado para recibir donaciones',
        },
      });
    }

    const donante = await this.userModel.findById(donanteId).exec();
    if (!donante) {
      throw new NotFoundException({
        error: { code: 'USER_NOT_FOUND', message: 'Usuario no encontrado' },
      });
    }

    // Obtener o crear Stripe Customer
    let stripeCustomerId: string | undefined = (
      donante as UserDocument & { stripeCustomerId?: string }
    ).stripeCustomerId;
    if (!stripeCustomerId) {
      const customer = await this.stripe.customers.create({
        email: donante.email,
        metadata: { donanteId },
      });
      stripeCustomerId = customer.id;
      await this.userModel.findByIdAndUpdate(donanteId, { $set: { stripeCustomerId } }).exec();
    }

    // Crear Price recurrente mensual (COP zero-decimal)
    const price = await this.stripe.prices.create({
      unit_amount: dto.montoMensual,
      currency: 'cop',
      recurring: { interval: 'month' },
      product_data: { name: `Donación mensual a ${refugio.nombre}` },
    });

    // Crear Subscription
    const subscription = await this.stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: price.id }],
      metadata: { refugioId: dto.refugioId, donanteId },
    });

    return this.repo.createSuscripcion({
      refugioId: new Types.ObjectId(dto.refugioId),
      donanteId: new Types.ObjectId(donanteId),
      montoMensual: dto.montoMensual,
      stripeSubscriptionId: subscription.id,
      estado: 'activa',
    });
  }

  // ── Cancelar Suscripción ──────────────────────────────────────────────────

  async cancelarSuscripcion(
    suscripcionId: string,
    donanteId: string,
  ): Promise<SuscripcionDonacionDocument> {
    const suscripcion = await this.repo.findSuscripcionById(suscripcionId);
    if (!suscripcion) {
      throw new NotFoundException({
        error: { code: 'SUSCRIPCION_NOT_FOUND', message: 'Suscripción no encontrada' },
      });
    }

    if (suscripcion.donanteId.toString() !== donanteId) {
      throw new ForbiddenException({
        error: {
          code: 'FORBIDDEN',
          message: 'No tienes permisos para cancelar esta suscripción',
        },
      });
    }

    await this.stripe.subscriptions.cancel(suscripcion.stripeSubscriptionId);

    const updated = await this.repo.cancelarSuscripcion(suscripcionId);
    return updated!;
  }

  // ── Historial de donaciones del refugio (por userId del dueño) ───────────

  async historialDonacionesByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedDonaciones> {
    const refugio = await this.refugioModel.findOne({ userId: new Types.ObjectId(userId) }).exec();
    if (!refugio) {
      throw new NotFoundException({
        error: { code: 'REFUGIO_NOT_FOUND', message: 'Refugio no encontrado' },
      });
    }
    return this.repo.findByRefugio(refugio._id.toString(), page, limit);
  }

  // ── Historial de donaciones del refugio (por refugioId) ──────────────────

  async historialDonaciones(
    refugioId: string,
    page: number,
    limit: number,
  ): Promise<PaginatedDonaciones> {
    return this.repo.findByRefugio(refugioId, page, limit);
  }

  // ── Obtener donación por ID ───────────────────────────────────────────────

  async findById(id: string): Promise<DonacionDocument | null> {
    return this.repo.findById(id);
  }
}
