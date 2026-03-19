import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { JwtModule } from '@nestjs/jwt';
import { Solicitud, SolicitudSchema } from './schemas/solicitud.schema';
import { SolicitudesRepository } from './solicitudes.repository';
import { SolicitudesService } from './solicitudes.service';
import { SolicitudesController } from './solicitudes.controller';
import { Animal, AnimalSchema } from '../animales/schemas/animal.schema';
import { Refugio, RefugioSchema } from '../refugios/schemas/refugio.schema';
import { Notificacion, NotificacionSchema } from '../notificaciones/schemas/notificacion.schema';

@Module({
  imports: [
    JwtModule.register({}),
    BullModule.registerQueue({ name: 'email' }),
    MongooseModule.forFeature([
      { name: Solicitud.name, schema: SolicitudSchema },
      { name: Animal.name, schema: AnimalSchema },
      { name: Refugio.name, schema: RefugioSchema },
      { name: Notificacion.name, schema: NotificacionSchema },
    ]),
  ],
  providers: [SolicitudesRepository, SolicitudesService],
  controllers: [SolicitudesController],
  exports: [SolicitudesService, SolicitudesRepository],
})
export class SolicitudesModule {}
