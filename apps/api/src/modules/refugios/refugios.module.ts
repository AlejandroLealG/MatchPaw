import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { Schema } from 'mongoose';
import { Refugio, RefugioSchema } from './schemas/refugio.schema';
import { RefugiosRepository } from './refugios.repository';
import { RefugiosService } from './refugios.service';
import { RefugiosController } from './refugios.controller';
import { Animal, AnimalSchema } from '../animales/schemas/animal.schema';

/**
 * Placeholder schemas for cross-module metrics queries.
 * SolicitudesModule and DonacionesModule are not yet implemented (tasks 7, 9).
 */
const SolicitudPlaceholderSchema = new Schema(
  {
    animalId: { type: Schema.Types.ObjectId, ref: 'Animal' },
    estado: String,
  },
  { collection: 'solicitudes' },
);

const DonacionPlaceholderSchema = new Schema(
  {
    refugioId: { type: Schema.Types.ObjectId, ref: 'Refugio' },
    estado: String,
    monto: Number,
    createdAt: Date,
  },
  { collection: 'donaciones' },
);

@Module({
  imports: [
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: Refugio.name, schema: RefugioSchema },
      { name: Animal.name, schema: AnimalSchema },
      { name: 'Solicitud', schema: SolicitudPlaceholderSchema },
      { name: 'Donacion', schema: DonacionPlaceholderSchema },
    ]),
  ],
  providers: [RefugiosRepository, RefugiosService],
  controllers: [RefugiosController],
  exports: [RefugiosService, RefugiosRepository],
})
export class RefugiosModule {}
