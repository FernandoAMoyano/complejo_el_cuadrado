import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { Pasajero } from '../models/pasajero';
import { API_URL } from '../api.config';
import { ErrorApi } from './error-api';

// Servicio de los pasajeros: el titular de cada reserva (HU-04).
@Injectable({
  providedIn: 'root',
})
export class PasajeroService {
  private url = `${API_URL}/pasajeros`;

  constructor(private http: HttpClient) {}

  listar(): Observable<Pasajero[]> {
    return this.http.get<Pasajero[]>(this.url).pipe(catchError((e) => this.fallar(e)));
  }

  obtener(id: string): Observable<Pasajero> {
    return this.http.get<Pasajero>(`${this.url}/${id}`).pipe(catchError((e) => this.fallar(e)));
  }

  // El DNI es único: si el pasajero ya vino antes, se reutiliza su registro
  buscarPorDni(dni: string): Observable<Pasajero[]> {
    const consulta = `dni=${encodeURIComponent(dni)}`;
    return this.http
      .get<Pasajero[]>(`${this.url}?${consulta}`)
      .pipe(catchError((e) => this.fallar(e)));
  }

  crear(pasajero: Pasajero): Observable<Pasajero> {
    return this.http.post<Pasajero>(this.url, pasajero).pipe(catchError((e) => this.fallar(e)));
  }

  private fallar(error: HttpErrorResponse) {
    console.error('Error en el servicio de pasajeros', error.status, error.error);
    return throwError(() => new Error(ErrorApi.mensaje(error, 'No se pudieron obtener los pasajeros.')));
  }
}
