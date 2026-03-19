import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type NotificacionDocument = HydratedDocument<Notificacion>;

export type NotificacionTipo =
  | 'nueva_solicitud'
  | 'cambio_estado_solicitud'
  | 'donacion_recibida'
  | 'animal_adoptado';

@Schema({ timestamps: true, collection: 'notificaciones' })
export class Notificacion {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['nueva_solicitud', 'cambio_estado_solicitud', 'donacion_recibida', 'animal_adoptado'],
  })
  tipo!: NotificacionTipo;

  @Prop({ required: true, trim: true })
  titulo!: string;

  @Prop({ required: true, trim: true })
  cuerpo!: string;

  @Prop({ default: false })
  leida!: boolean;
}

export const NotificacionSchema = SchemaFactory.createForClass(Notificacion);

// Índices — Requisitos 8.1, 8.2
NotificacionSchema.index({ userId: 1, createdAt: -1 });
NotificacionSchema.index({ userId: 1, leida: 1 });
