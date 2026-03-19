export type SolicitudEstado = 'pendiente' | 'aprobada' | 'rechazada';
export interface ISolicitud {
  _id: string;
  animalId: string;
  adoptanteId: string;
  estado: SolicitudEstado;
  descripcionHogar?: string;
  experienciaMascotas?: string;
  motivoRefugio?: string;
  createdAt: Date;
  updatedAt: Date;
}
//# sourceMappingURL=request.types.d.ts.map
