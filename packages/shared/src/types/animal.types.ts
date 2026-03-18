export interface IFoto {
  url: string;
  orden: number;
}

export interface IAnimal {
  _id: string;
  refugioId: string;
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
  estado: 'disponible' | 'en_proceso' | 'adoptado';
  fotos: IFoto[];
  createdAt: Date;
  updatedAt: Date;
}
