export interface CreateDonacionDto {
  refugioId: string;
  /** Monto en pesos colombianos enteros (COP, sin decimales) */
  monto: number;
}

export interface CreateSuscripcionDto {
  refugioId: string;
  /** Monto mensual en pesos colombianos enteros (COP, sin decimales) */
  montoMensual: number;
}
