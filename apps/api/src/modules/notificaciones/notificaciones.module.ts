import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { JwtModule } from '@nestjs/jwt';
import { Notificacion, NotificacionSchema } from './schemas/notificacion.schema';
import { PushSubscription, PushSubscriptionSchema } from './schemas/push-subscription.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { NotificacionesRepository } from './notificaciones.repository';
import { NotificacionesService } from './notificaciones.service';
import { NotificacionesController } from './notificaciones.controller';
import { NotificacionesGateway } from './notificaciones.gateway';
import { EmailProcessor } from './email.processor';

@Module({
  imports: [
    JwtModule.register({}),
    BullModule.registerQueue({
      name: 'email',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'fixed', delay: 5 * 60 * 1000 }, // 5 minutos — Requisito 8.3
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
    MongooseModule.forFeature([
      { name: Notificacion.name, schema: NotificacionSchema },
      { name: PushSubscription.name, schema: PushSubscriptionSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [
    NotificacionesRepository,
    NotificacionesService,
    NotificacionesGateway,
    EmailProcessor,
  ],
  controllers: [NotificacionesController],
  exports: [NotificacionesService, NotificacionesGateway],
})
export class NotificacionesModule {}
