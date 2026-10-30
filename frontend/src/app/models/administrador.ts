// Tabla ADMINISTRADOR (docs/MR.md). La clave nunca vuelve de la API.
// Como en Programación II, el JSON usa "id" aunque la columna sea id_administrador.
export interface Administrador {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
}
