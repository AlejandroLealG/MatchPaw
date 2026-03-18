import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SolicitudEstado } from '@matchpaw/shared';

export type SolicitudDocument = HydratedDocument<Solicitud>;

@Schema({ timestamps: true })
export class Solicitud {
  @Prop({ type: Types.ObjectId, ref: 'Animal', required: true })
  animalId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  adoptanteId!: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['pendiente', 'aprobada', 'rechazada'],
    default: 'pendiente',
  })
  estado!: SolicitudEstado;

  @Prop({ trim: true })
  descripcionHogar?: string;

  @Prop({ trim: true })
  experienciaMascotas?: string;

  @Prop({ trim: true })
  motivoRefugio?: string;

  /** Motivo indicado por el refugio al aprobar o rechazar */
  @Prop({ trim: true })
  motivoCambioEstado?: string;
}

export const SolicitudSchema = SchemaFactory.createForClass(Solicitud);

/**
 * Índice único parcial: un adoptante solo puede tener una solicitud activa
 * (pendiente o aprobada) por animal. Las rechazadas no cuentan.
 * Requisitos: 5.1, 5.6
 */
SolicitudSchema.index(
  { animalId: 1, adoptanteId: 1 },
  {
    unique: true,
    partialFilterExpression: { estado: { $in: ['pendiente', 'aprobada'] } },
  },
);

// Consultas frecuentes
SolicitudSchema.index({ adoptanteId: 1, createdAt: -1 });
SolicitudSchema.index({ animalId: 1, estado: 1 });
