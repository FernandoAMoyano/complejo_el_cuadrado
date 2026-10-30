import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { Unidad } from '../models/unidad';
import { API_URL } from '../api.config';
import { ErrorApi } from './error-api';

// Servicio de las unidades (HU-02) y de la consulta de disponibilidad (HU-03).
@Injectable({
  providedIn: 'root',
})
export class UnidadService {
  private url = `${API_URL}/unidades`;

  constructor(private http: HttpClient) {}

  listar(): Observable<Unidad[]> {
    return this.http.get<Unidad[]>(this.url).pipe(catchError((e) => this.fallar(e)));
  }

  obtener(id: string): Observable<Unidad> {
    return this.http.get<Unidad>(`${this.url}/${id}`).pipe(catchError((e) => this.fallar(e)));
  }

  crear(unidad: Unidad): Observable<Unidad> {
    return this.http.post<Unidad>(this.url, unidad).pipe(catchError((e) => this.fallar(e)));
  }

  // PUT con nombre, capacidad y descripción: el estado no se edita en el formulario
  actualizar(id: string, unidad: Unidad): Observable<Unidad> {
    return this.http
      .put<Unidad>(`${this.url}/${id}`, unidad)
      .pipe(catchError((e) => this.fallar(e)));
  }

  // Acción rápida del listado. El backend valida el cambio (una Ocupada no se toca a mano).
  cambiarEstado(id: number, estado: string): Observable<Unidad> {
    return this.http
      .patch<Unidad>(`${this.url}/${id}`, { estado })
      .pipe(catchError((e) => this.fallar(e)));
  }

  // HU-03: el backend devuelve las unidades con capacidad suficiente, que no
  // están en mantenimiento y sin reservas activas superpuestas.
  listarDisponibles(ingreso: string, egreso: string, huespedes: number): Observable<Unidad[]> {
    const consulta = `ingreso=${ingreso}&egreso=${egreso}&huespedes=${huespedes}`;
    return this.http
      .get<Unidad[]>(`${API_URL}/disponibilidad?${consulta}`)
      .pipe(catchError((e) => this.fallar(e)));
  }

  // ========== PRESENTACIÓN ==========
  // HU-02: cada estado con su propia identificación visual (styles.css)
  claseEstado(estado: string | undefined): string {
    if (estado === 'Disponible') {
      return 'estado estado-disponible';
    }
    if (estado === 'Ocupada') {
      return 'estado estado-ocupada';
    }
    if (estado === 'En limpieza') {
      return 'estado estado-limpieza';
    }
    return 'estado estado-mantenimiento';
  }

  private fallar(error: HttpErrorResponse) {
    console.error('Error en el servicio de unidades', error.status, error.error);
    return throwError(() => new Error(ErrorApi.mensaje(error, 'No se pudieron obtener las unidades.')));
  }
}
