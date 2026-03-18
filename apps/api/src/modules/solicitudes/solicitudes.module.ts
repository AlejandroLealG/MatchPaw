import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { JwtModule } from '@nestjs/jwt';
import { Schema } from 'mongoose';
import { Solicitud, SolicitudSchema } from './schemas/solicitud.schema';
import { SolicitudesRepository } from './solicitudes.repository';
import { SolicitudesService } from './solicitudes.service';
import { SolicitudesController } from './solicitudes.controller';
import { Animal, AnimalSchema } from '../animales/schemas/animal.schema';
import { Refugio, RefugioSchema } from '../refugios/schemas/refugio.schema';

/** Placeholder schema para notificaciones (NotificacionesModule — tarea 10) */
const NotificacionPlaceholderSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    tipo: String,
    titulo: String,
    cuerpo: String,
    leida: { type: Boolean, default: false },
  },
  { collection: 'notificaciones', timestamps: true },
);

@Module({
  imports: [
    JwtModule.register({}),
    BullModule.registerQueue({ name: 'email' }),
    MongooseModule.forFeature([
      { name: Solicitud.name, schema: SolicitudSchema },
      { name: Animal.name, schema: AnimalSchema },
      { name: Refugio.name, schema: RefugioSchema },
      { name: 'Notificacion', schema: NotificacionPlaceholderSchema },
    ]),
  ],
  providers: [SolicitudesRepository, SolicitudesService],
  controllers: [SolicitudesController],
  exports: [SolicitudesService, SolicitudesRepository],
})
export class SolicitudesModule {}
