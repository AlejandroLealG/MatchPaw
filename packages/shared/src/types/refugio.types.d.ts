export type RefugioEstado = 'pendiente_verificacion' | 'verificado' | 'rechazado' | 'suspendido';
export interface IRefugio {
  _id: string;
  userId: string;
  nombre: string;
  descripcion: string;
  ciudad: string;
  direccion: string;
  telefono: string;
  fotoUrl?: string;
  estado: RefugioEstado;
  motivoRechazo?: string;
  createdAt: Date;
}
//# sourceMappingURL=refugio.types.d.ts.map
