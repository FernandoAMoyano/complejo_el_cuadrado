import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { Reserva } from '../models/reserva';
import { Unidad } from '../models/unidad';
import { Pasajero } from '../models/pasajero';
import { Pago } from '../models/pago';
import { API_URL } from '../api.config';
import { ErrorApi } from './error-api';

// Una reserva con los datos que la API devuelve aparte: el nombre de la
// unidad, el titular y los pagos. El cruce se hace acá, como en Programación II.
export interface ReservaConDatos {
  reserva: Reserva;
  unidad: Unidad | null;
  pasajero: Pasajero | null;
  pagado: number;
  saldo: number;
}

// Servicio de las reservas: alta (HU-04), listado y cancelación (HU-05),
// plazo de la seña (HU-07), check-in y check-out (HU-08, HU-09) y el enlace
// de WhatsApp (HU-10).
@Injectable({
  providedIn: 'root',
})
export class ReservaService {
  private url = `${API_URL}/reservas`;

  constructor(private http: HttpClient) {}

  // Filtros opcionales del listado (HU-05): estado, y apellido o DNI del titular
  listar(estado = '', busqueda = ''): Observable<Reserva[]> {
    const filtros: string[] = [];
    if (estado) {
      filtros.push(`estado=${encodeURIComponent(estado)}`);
    }
    if (busqueda) {
      // Si son solo números se busca por DNI; si no, por apellido
      const campo = /^[0-9]+$/.test(busqueda) ? 'dni' : 'apellido';
      filtros.push(`${campo}=${encodeURIComponent(busqueda)}`);
    }
    const consulta = filtros.length > 0 ? `?${filtros.join('&')}` : '';
    return this.http.get<Reserva[]>(`${this.url}${consulta}`).pipe(catchError((e) => this.fallar(e)));
  }

  obtener(id: string): Observable<Reserva> {
    return this.http.get<Reserva>(`${this.url}/${id}`).pipe(catchError((e) => this.fallar(e)));
  }

  // Queda Pendiente de seña: el backend calcula la fecha límite (48 h)
  crear(reserva: Reserva): Observable<Reserva> {
    return this.http.post<Reserva>(this.url, reserva).pipe(catchError((e) => this.fallar(e)));
  }

  // 'Cancelada' (HU-05), 'En curso' = check-in (HU-08), 'Finalizada' = check-out (HU-09).
  // El backend valida el cambio y actualiza el estado de la unidad.
  cambiarEstado(id: number, estado: string): Observable<Reserva> {
    return this.http
      .patch<Reserva>(`${this.url}/${id}`, { estado })
      .pipe(catchError((e) => this.fallar(e)));
  }

  // HU-07: el administrador extiende la fecha límite de la seña
  extenderPlazo(id: number, fechaLimite: string): Observable<Reserva> {
    return this.http
      .patch<Reserva>(`${this.url}/${id}`, { fecha_limite_pago: fechaLimite })
      .pipe(catchError((e) => this.fallar(e)));
  }

  // ========== CRUCE DE DATOS ==========
  conDatos(
    reservas: Reserva[],
    unidades: Unidad[],
    pasajeros: Pasajero[],
    pagos: Pago[],
  ): ReservaConDatos[] {
    return reservas.map((reserva) => {
      const pagado = this.totalPagado(reserva, pagos);
      return {
        reserva,
        unidad: unidades.find((u) => u.id === reserva.id_unidad) ?? null,
        pasajero: pasajeros.find((p) => p.id === reserva.id_pasajero) ?? null,
        pagado,
        saldo: reserva.importe_acordado - pagado,
      };
    });
  }

  // HU-06: saldo = importe acordado menos los pagos registrados
  totalPagado(reserva: Reserva, pagos: Pago[]): number {
    let total = 0;
    pagos
      .filter((pago) => pago.id_reserva === reserva.id)
      .forEach((pago) => (total += pago.monto));
    return total;
  }

  // ========== PRESENTACIÓN ==========
  claseEstado(estado: string | undefined): string {
    if (estado === 'Pendiente de seña') {
      return 'estado estado-pendiente';
    }
    if (estado === 'Confirmada') {
      return 'estado estado-confirmada';
    }
    if (estado === 'En curso') {
      return 'estado estado-en-curso';
    }
    if (estado === 'Finalizada') {
      return 'estado estado-finalizada';
    }
    return 'estado estado-cancelada';
  }

  // '2026-11-03' → '03/11/2026'; con hora: '2026-11-03T18:30:00' → '03/11/2026 18:30'
  formatoFecha(valor: string | null | undefined): string {
    if (!valor) {
      return '—';
    }
    const [fecha, hora] = valor.split('T');
    const [anio, mes, dia] = fecha.split('-');
    const texto = `${dia}/${mes}/${anio}`;
    return hora ? `${texto} ${hora.substring(0, 5)}` : texto;
  }

  formatoMoneda(monto: number): string {
    return '$' + monto.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  noches(reserva: Reserva): number {
    const entrada = new Date(reserva.fecha_ingreso).getTime();
    const salida = new Date(reserva.fecha_egreso).getTime();
    return Math.round((salida - entrada) / (1000 * 60 * 60 * 24));
  }

  // ========== WHATSAPP (HU-10) ==========
  // Pasa el teléfono al formato internacional que pide wa.me: 549 + código de
  // área + número, sin espacios ni guiones. Devuelve null si no se puede.
  telefonoWhatsapp(telefono: string): string | null {
    let numeros = telefono.replace(/[^0-9]/g, '');
    if (numeros.startsWith('549') && numeros.length === 13) {
      return numeros;
    }
    if (numeros.startsWith('54') && numeros.length === 12) {
      return '549' + numeros.substring(2);
    }
    if (numeros.startsWith('0')) {
      numeros = numeros.substring(1);
    }
    if (numeros.length === 10) {
      return '549' + numeros;
    }
    return null;
  }

  // El mensaje incluye fechas, unidad, importe, seña y saldo. El sistema no lo
  // envía: abre el chat y el administrador lo revisa y lo manda.
  enlaceWhatsapp(datos: ReservaConDatos, sena: number): string | null {
    if (!datos.pasajero) {
      return null;
    }
    const telefono = this.telefonoWhatsapp(datos.pasajero.telefono);
    if (!telefono) {
      return null;
    }
    const reserva = datos.reserva;
    const lineas = [
      `Hola ${datos.pasajero.nombre}! Te escribimos del Complejo El Cuadrado por tu reserva N° ${reserva.id}:`,
      `• Unidad: ${datos.unidad ? datos.unidad.nombre : ''}`,
      `• Ingreso: ${this.formatoFecha(reserva.fecha_ingreso)} - Egreso: ${this.formatoFecha(reserva.fecha_egreso)}`,
      `• Huéspedes: ${reserva.cantidad_huespedes}`,
      `• Importe acordado: ${this.formatoMoneda(reserva.importe_acordado)}`,
      sena > 0
        ? `• Seña: ${this.formatoMoneda(sena)}`
        : `• Seña: pendiente, hasta el ${this.formatoFecha(reserva.fecha_limite_pago)}`,
      `• Saldo: ${this.formatoMoneda(datos.saldo)}`,
      '¡Te esperamos!',
    ];
    return `https://wa.me/${telefono}?text=${encodeURIComponent(lineas.join('\n'))}`;
  }

  private fallar(error: HttpErrorResponse) {
    console.error('Error en el servicio de reservas', error.status, error.error);
    return throwError(() => new Error(ErrorApi.mensaje(error, 'No se pudieron obtener las reservas.')));
  }
}
