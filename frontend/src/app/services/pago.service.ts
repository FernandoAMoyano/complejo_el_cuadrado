import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { Pago } from '../models/pago';
import { API_URL } from '../api.config';
import { ErrorApi } from './error-api';

// Servicio de los pagos (HU-06). Si la reserva está pendiente, el primer pago
// es la seña: el backend la confirma y le quita el vencimiento.
@Injectable({
  providedIn: 'root',
})
export class PagoService {
  private url = `${API_URL}/pagos`;

  constructor(private http: HttpClient) {}

  listar(): Observable<Pago[]> {
    return this.http.get<Pago[]>(this.url).pipe(catchError((e) => this.fallar(e)));
  }

  listarPorReserva(idReserva: string): Observable<Pago[]> {
    const consulta = `id_reserva=${encodeURIComponent(idReserva)}`;
    return this.http
      .get<Pago[]>(`${this.url}?${consulta}`)
      .pipe(catchError((e) => this.fallar(e)));
  }

  // El backend rechaza un pago mayor al saldo o sobre una reserva cancelada
  crear(pago: Pago): Observable<Pago> {
    return this.http.post<Pago>(this.url, pago).pipe(catchError((e) => this.fallar(e)));
  }

  private fallar(error: HttpErrorResponse) {
    console.error('Error en el servicio de pagos', error.status, error.error);
    return throwError(() => new Error(ErrorApi.mensaje(error, 'No se pudo registrar el pago.')));
  }
}
