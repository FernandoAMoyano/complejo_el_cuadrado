// Tabla PASAJERO (docs/MR.md): el titular de la reserva. El email es opcional.
export interface Pasajero {
  id?: number;
  nombre: string;
  apellido: string;
  dni: string;
  telefono: string;
  email?: string | null;
}
