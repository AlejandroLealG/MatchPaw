import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SuscripcionEstado } from '@matchpaw/shared';

export type SuscripcionDonacionDocument = HydratedDocument<SuscripcionDonacion>;

@Schema({ timestamps: true })
export class SuscripcionDonacion {
  @Prop({ type: Types.ObjectId, ref: 'Refugio', required: true })
  refugioId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  donanteId!: Types.ObjectId;

  @Prop({ required: true })
  montoMensual!: number;

  @Prop({ required: true, unique: true })
  stripeSubscriptionId!: string;

  @Prop({
    required: true,
    enum: ['activa', 'cancelada'],
    default: 'activa',
  })
  estado!: SuscripcionEstado;
}

export const SuscripcionDonacionSchema = SchemaFactory.createForClass(SuscripcionDonacion);

SuscripcionDonacionSchema.index({ donanteId: 1, refugioId: 1 });
