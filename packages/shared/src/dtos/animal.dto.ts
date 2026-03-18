import { IFoto } from '../types/animal.types';

export interface CreateAnimalDto {
  nombre: string;
  especie: 'perro' | 'gato' | 'otro';
  raza: string;
  edadMeses: number;
  sexo: 'macho' | 'hembra';
  tamano: 'pequeno' | 'mediano' | 'grande';
  descripcion: string;
  estadoSalud: string;
  vacunado: boolean;
  esterilizado: boolean;
  fotos: IFoto[];
}

export interface UpdateAnimalDto {
  nombre?: string;
  especie?: 'perro' | 'gato' | 'otro';
  raza?: string;
  edadMeses?: number;
  sexo?: 'macho' | 'hembra';
  tamano?: 'pequeno' | 'mediano' | 'grande';
  descripcion?: string;
  estadoSalud?: string;
  vacunado?: boolean;
  esterilizado?: boolean;
  fotos?: IFoto[];
}

export interface AnimalFilterDto {
  especie?: 'perro' | 'gato' | 'otro';
  raza?: string;
  sexo?: 'macho' | 'hembra';
  tamano?: 'pequeno' | 'mediano' | 'grande';
  ciudad?: string;
  edadMinMeses?: number;
  edadMaxMeses?: number;
  q?: string;
  orderBy?: 'reciente' | 'antiguo';
  page?: number;
  limit?: number;
}
