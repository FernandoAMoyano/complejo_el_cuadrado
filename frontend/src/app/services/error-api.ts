import { HttpErrorResponse } from '@angular/common/http';

// Traduce los errores de la API a un mensaje para mostrar en pantalla.
// Cuando el backend rechaza un dato (status 400) responde { campo: ['mensaje'] }
// con el motivo de la regla que no se cumple: se muestra el primero.
// Es un método estático porque no guarda estado: lo usan todos los servicios.
export class ErrorApi {
  static mensaje(error: HttpErrorResponse, porDefecto: string): string {
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. ¿Está levantado el backend?';
    }
    if (error.status !== 400) {
      return porDefecto;
    }
    const cuerpo = typeof error.error === 'object' && error.error !== null ? error.error : {};
    const primero = Object.values(cuerpo)[0];
    const texto = Array.isArray(primero) ? primero[0] : primero;
    return typeof texto === 'string' ? texto : porDefecto;
  }
}
