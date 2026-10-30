import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { Administrador } from '../models/administrador';
import { API_URL } from '../api.config';
import { ErrorApi } from './error-api';

// HU-01: inicio y cierre de sesión. Guarda al administrador de la sesión:
// el layout lo consulta para no mostrar ninguna pantalla sin sesión iniciada.
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  administradorActual: Administrador | null = null;

  constructor(private http: HttpClient) {}

  // POST /login: la clave viaja en el cuerpo del pedido y no en la URL.
  // Si no coinciden, la API responde 401 sin decir cuál de los datos está mal.
  login(email: string, clave: string): Observable<Administrador> {
    return this.http
      .post<Administrador>(`${API_URL}/login`, { email, clave_acceso: clave })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 401) {
            return throwError(() => new Error('Correo electrónico o contraseña incorrectos.'));
          }
          return throwError(() => new Error(ErrorApi.mensaje(error, 'No se pudo iniciar sesión.')));
        }),
      );
  }

  guardarSesion(administrador: Administrador): void {
    this.administradorActual = administrador;
  }

  logout(): void {
    this.administradorActual = null;
  }
}
