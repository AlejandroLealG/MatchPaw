import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AnimalDocument = HydratedDocument<Animal>;

@Schema({ _id: false })
class Foto {
  @Prop({ required: true })
  url!: string;

  @Prop({ required: true })
  orden!: number;
}

const FotoSchema = SchemaFactory.createForClass(Foto);

@Schema({ timestamps: true })
export class Animal {
  @Prop({ type: Types.ObjectId, ref: 'Refugio', required: true })
  refugioId!: Types.ObjectId;

  @Prop({ required: true, trim: true })
  nombre!: string;

  @Prop({ required: true, enum: ['perro', 'gato', 'otro'] })
  especie!: 'perro' | 'gato' | 'otro';

  @Prop({ required: true, trim: true })
  raza!: string;

  @Prop({ required: true, min: 0 })
  edadMeses!: number;

  @Prop({ required: true, enum: ['macho', 'hembra'] })
  sexo!: 'macho' | 'hembra';

  @Prop({ required: true, enum: ['pequeno', 'mediano', 'grande'] })
  tamano!: 'pequeno' | 'mediano' | 'grande';

  @Prop({ required: true, trim: true })
  descripcion!: string;

  @Prop({ required: true, trim: true })
  estadoSalud!: string;

  @Prop({ required: true, default: false })
  vacunado!: boolean;

  @Prop({ required: true, default: false })
  esterilizado!: boolean;

  @Prop({
    required: true,
    enum: ['disponible', 'en_proceso', 'adoptado'],
    default: 'disponible',
  })
  estado!: 'disponible' | 'en_proceso' | 'adoptado';

  @Prop({ type: [FotoSchema], default: [] })
  fotos!: Foto[];
}

export const AnimalSchema = SchemaFactory.createForClass(Animal);

// Búsqueda full-text
AnimalSchema.index({ nombre: 'text', raza: 'text', descripcion: 'text' });

// Filtros frecuentes
AnimalSchema.index({ estado: 1 });
AnimalSchema.index({ refugioId: 1, estado: 1 });
AnimalSchema.index({ especie: 1, estado: 1 });
