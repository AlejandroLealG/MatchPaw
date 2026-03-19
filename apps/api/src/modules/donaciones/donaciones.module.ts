import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { Donacion, DonacionSchema } from './schemas/donacion.schema';
import {
  SuscripcionDonacion,
  SuscripcionDonacionSchema,
} from './schemas/suscripcion-donacion.schema';
import { Refugio, RefugioSchema } from '../refugios/schemas/refugio.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Notificacion, NotificacionSchema } from '../notificaciones/schemas/notificacion.schema';
import { DonacionesRepository } from './donaciones.repository';
import { DonacionesService } from './donaciones.service';
import { DonacionesController } from './donaciones.controller';

@Module({
  imports: [
    ConfigModule,
    JwtModule.register({}),
    BullModule.registerQueue({ name: 'email' }),
    MongooseModule.forFeature([
      { name: Donacion.name, schema: DonacionSchema },
      { name: SuscripcionDonacion.name, schema: SuscripcionDonacionSchema },
      { name: Refugio.name, schema: RefugioSchema },
      { name: User.name, schema: UserSchema },
      { name: Notificacion.name, schema: NotificacionSchema },
    ]),
  ],
  providers: [DonacionesRepository, DonacionesService],
  controllers: [DonacionesController],
  exports: [DonacionesService, DonacionesRepository],
})
export class DonacionesModule {}
