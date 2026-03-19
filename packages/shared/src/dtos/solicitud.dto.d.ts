import { SolicitudEstado } from '../types/request.types';
export interface CreateSolicitudDto {
  animalId: string;
  descripcionHogar?: string;
  experienciaMascotas?: string;
  motivoRefugio?: string;
}
export interface UpdateSolicitudEstadoDto {
  estado: SolicitudEstado;
  motivo?: string;
}
//# sourceMappingURL=solicitud.dto.d.ts.map
