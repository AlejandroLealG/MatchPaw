export type DonacionEstado = 'pendiente' | 'completada' | 'fallida';
export type SuscripcionEstado = 'activa' | 'cancelada';
export interface IDonacion {
  _id: string;
  refugioId: string;
  donanteId: string;
  monto: number;
  moneda: string;
  stripePaymentIntentId: string;
  numeroReferencia: string;
  estado: DonacionEstado;
  createdAt: Date;
}
export interface ISuscripcionDonacion {
  _id: string;
  refugioId: string;
  donanteId: string;
  montoMensual: number;
  stripeSubscriptionId: string;
  estado: SuscripcionEstado;
  createdAt: Date;
}
//# sourceMappingURL=donation.types.d.ts.map
