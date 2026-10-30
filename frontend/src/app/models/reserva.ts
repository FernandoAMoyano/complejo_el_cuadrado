// Tabla RESERVA (docs/MR.md). Los campos opcionales los completa el backend:
// estado inicial, fecha de registro, fecha límite de la seña, motivo de la
// cancelación y fecha y hora del check-in y del check-out.
export interface Reserva {
  id?: number;
  id_unidad: number;
  id_pasajero: number;
  fecha_ingreso: string;
  fecha_egreso: string;
  cantidad_huespedes: number;
  importe_acordado: number;
  estado?: string;
  fecha_registro?: string;
  fecha_limite_pago?: string | null;
  motivo_cancelacion?: string | null;
  fecha_hora_checkin?: string | null;
  fecha_hora_checkout?: string | null;
}
