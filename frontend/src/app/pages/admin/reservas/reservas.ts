import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, switchMap } from 'rxjs';
import { ReservaConDatos, ReservaService } from '../../../services/reserva.service';
import { UnidadService } from '../../../services/unidad.service';
import { PasajeroService } from '../../../services/pasajero.service';
import { PagoService } from '../../../services/pago.service';
import { Reserva } from '../../../models/reserva';
import { Unidad } from '../../../models/unidad';
import { Pasajero } from '../../../models/pasajero';
import { Pago } from '../../../models/pago';

// HU-05: listado de reservas con unidad, titular, fechas, estado y saldo,
// filtro por estado y búsqueda por apellido o DNI. Permite cancelar.
// HU-07: muestra la fecha límite de pago de cada reserva pendiente.
@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-reservas',
  styleUrl: './reservas.css',
  templateUrl: './reservas.html',
})
export class Reservas implements OnInit {
  private fb = inject(FormBuilder);
  protected reservaService = inject(ReservaService);
  private unidadService = inject(UnidadService);
  private pasajeroService = inject(PasajeroService);
  private pagoService = inject(PagoService);
  private cd = inject(ChangeDetectorRef);

  items: ReservaConDatos[] = [];
  cargado = false;
  error = '';
  cancelando = false;

  estados = ['Pendiente de seña', 'Confirmada', 'En curso', 'Finalizada', 'Cancelada'];

  filtros = this.fb.nonNullable.group({
    estado: [''],
    busqueda: [''],
  });

  ngOnInit(): void {
    this.cargar();
  }

  // ========== CARGA DEL LISTADO ==========
  // forkJoin trae las reservas filtradas y las tablas con las que se cruzan:
  // la API devuelve solo los id de la unidad y del titular, y los pagos aparte.
  private pedirListado() {
    const { estado, busqueda } = this.filtros.getRawValue();
    return forkJoin({
      reservas: this.reservaService.listar(estado, busqueda.trim()),
      unidades: this.unidadService.listar(),
      pasajeros: this.pasajeroService.listar(),
      pagos: this.pagoService.listar(),
    });
  }

  private mostrar(datos: {
    reservas: Reserva[];
    unidades: Unidad[];
    pasajeros: Pasajero[];
    pagos: Pago[];
  }): void {
    this.items = this.reservaService.conDatos(
      datos.reservas,
      datos.unidades,
      datos.pasajeros,
      datos.pagos,
    );
    this.cargado = true;
    this.cancelando = false;
    this.cd.markForCheck();
  }

  cargar(): void {
    this.error = '';
    this.pedirListado().subscribe({
      next: (datos) => this.mostrar(datos),
      error: (error) => this.fallar(error),
    });
  }

  limpiarFiltros(): void {
    this.filtros.setValue({ estado: '', busqueda: '' });
    this.cargar();
  }

  contar(estado: string): number {
    return this.items.filter((item) => item.reserva.estado === estado).length;
  }

  // Es deuda cuando el pasajero ya ingresó (o ya se fue) sin pagar todo
  tieneDeuda(item: ReservaConDatos): boolean {
    const estado = item.reserva.estado;
    return item.saldo > 0 && (estado === 'En curso' || estado === 'Finalizada');
  }

  // Solo se cancelan reservas pendientes de seña o confirmadas (HU-05)
  sePuedeCancelar(estado: string | undefined): boolean {
    return estado === 'Pendiente de seña' || estado === 'Confirmada';
  }

  // ========== CANCELAR UNA RESERVA ==========
  // Previa confirmación del administrador. La reserva conserva su registro y
  // sus pagos, y libera las fechas de la unidad.
  cancelar(item: ReservaConDatos): void {
    const titular = item.pasajero ? `${item.pasajero.apellido}, ${item.pasajero.nombre}` : '';
    if (!confirm(`¿Cancelar la reserva N° ${item.reserva.id} de ${titular}?`)) {
      return;
    }
    this.error = '';
    this.cancelando = true;

    // switchMap: cuando termina la cancelación, recién ahí se vuelve a pedir el listado
    this.reservaService
      .cambiarEstado(Number(item.reserva.id), 'Cancelada')
      .pipe(switchMap(() => this.pedirListado()))
      .subscribe({
        next: (datos) => this.mostrar(datos),
        error: (error) => this.fallar(error),
      });
  }

  private fallar(error: Error): void {
    this.error = error.message;
    this.cancelando = false;
    this.cd.markForCheck();
  }
}
