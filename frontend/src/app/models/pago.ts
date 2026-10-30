// Tabla PAGO (docs/MR.md). medio_pago: Efectivo o Transferencia.
export interface Pago {
  id?: number;
  id_reserva: number;
  monto: number;
  fecha: string;
  medio_pago: string;
}
