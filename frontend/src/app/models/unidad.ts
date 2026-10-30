// Tabla UNIDAD (docs/MR.md). El estado lo pone el sistema: en el alta queda
// Disponible y después cambia con las acciones (HU-02, HU-08, HU-09).
export interface Unidad {
  id?: number;
  nombre: string;
  capacidad: number;
  estado?: string;
  descripcion?: string | null;
}
