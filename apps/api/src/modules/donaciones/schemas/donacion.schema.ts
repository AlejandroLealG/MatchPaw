import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { DonacionEstado } from '@matchpaw/shared';

export type DonacionDocument = HydratedDocument<Donacion>;

@Schema({ timestamps: true })
export class Donacion {
  @Prop({ type: Types.ObjectId, ref: 'Refugio', required: true })
  refugioId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  donanteId!: Types.ObjectId;

  @Prop({ required: true })
  monto!: number;

  @Prop({ default: 'COP' })
  moneda!: string;

  @Prop({ required: true, unique: true })
  stripePaymentIntentId!: string;

  @Prop({ required: true, unique: true })
  numeroReferencia!: string;

  @Prop({
    required: true,
    enum: ['pendiente', 'completada', 'fallida'],
    default: 'pendiente',
  })
  estado!: DonacionEstado;
}

export const DonacionSchema = SchemaFactory.createForClass(Donacion);

DonacionSchema.index({ refugioId: 1, createdAt: -1 });
