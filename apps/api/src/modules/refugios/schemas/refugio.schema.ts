import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { RefugioEstado } from '@matchpaw/shared';

export type RefugioDocument = HydratedDocument<Refugio>;

@Schema({ timestamps: true })
export class Refugio {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  nombre!: string;

  @Prop({ required: true, trim: true })
  descripcion!: string;

  @Prop({ required: true, trim: true })
  ciudad!: string;

  @Prop({ required: true, trim: true })
  direccion!: string;

  @Prop({ required: true, trim: true })
  telefono!: string;

  @Prop({ type: String, default: null })
  fotoUrl!: string | null;

  @Prop({
    required: true,
    enum: ['pendiente_verificacion', 'verificado', 'rechazado', 'suspendido'],
    default: 'pendiente_verificacion',
  })
  estado!: RefugioEstado;

  @Prop({ type: String, default: null })
  motivoRechazo!: string | null;
}

export const RefugioSchema = SchemaFactory.createForClass(Refugio);

// Un usuario solo puede tener un refugio
RefugioSchema.index({ userId: 1 }, { unique: true });

// Filtrado frecuente por estado (verificación, búsqueda)
RefugioSchema.index({ estado: 1 });
