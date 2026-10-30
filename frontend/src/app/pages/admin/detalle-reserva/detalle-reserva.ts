import { ChangeDetectorRef, Component, Input, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, forkJoin, of, switchMap } from 'rxjs';
import { ReservaConDatos, ReservaService } from '../../../services/reserva.service';
import { UnidadService } from '../../../services/unidad.service';
import { PasajeroService } from '../../../services/pasajero.service';
import { PagoService } from '../../../services/pago.service';
import { Pago } from '../../../models/pago';
import { Reserva } from '../../../models/reserva';
import { Unidad } from '../../../models/unidad';
import { Pasajero } from '../../../models/pasajero';

// Detalle de una reserva y todo lo que se hace sobre ella:
// HU-06 seña y pagos con el saldo · HU-07 extender la fecha límite ·
// HU-08 check-in · HU-09 check-out · HU-05 cancelar · HU-10 WhatsApp.
@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-detalle-reserva',
  styleUrl: './detalle-reserva.css',
  templateUrl: './detalle-reserva.html',
})
export class DetalleReserva implements OnInit {
  @Input() id = '';

  private fb = inject(FormBuilder);
  protected reservaService = inject(ReservaService);
  protected unidadService = inject(UnidadService);
  private pasajeroService = inject(PasajeroService);
  private pagoService = inject(PagoService);
  private cd = inject(ChangeDetectorRef);

  datos: ReservaConDatos | null = null;
  pagos: Pago[] = [];
  enlaceWhatsapp: string | null = null;
  error = '';
  mensaje = '';
  procesando = false;

  pagoForm = this.fb.nonNullable.group({
    monto: ['', [Validators.required]],
    fecha: [this.hoy(), [Validators.required]],
    medio_pago: ['Transferencia', [Validators.required]],
  });

  plazoForm = this.fb.nonNullable.group({
    fechaLimite: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.cargar();
  }

  // ========== CARGA ==========
  // La reserva primero (tiene los id de la unidad y del titular) y, con
  // switchMap, la unidad, el titular y los pagos a la vez con forkJoin.
  private pedirDatos() {
    return this.reservaService.obtener(this.id).pipe(
      switchMap((reserva) =>
        forkJoin({
          reserva: of(reserva),
          unidad: this.unidadService.obtener(String(reserva.id_unidad)),
          pasajero: this.pasajeroService.obtener(String(reserva.id_pasajero)),
          pagos: this.pagoService.listarPorReserva(this.id),
        }),
      ),
    );
  }

  private cargar(): void {
    this.pedirDatos().subscribe({
      next: (datos) => this.mostrar(datos),
      error: (error) => this.fallar(error),
    });
  }

  private mostrar(datos: { reserva: Reserva; unidad: Unidad; pasajero: Pasajero; pagos: Pago[] }): void {
    this.pagos = datos.pagos;
    // Mismo cruce que el listado, con una sola reserva
    this.datos = this.reservaService.conDatos(
      [datos.reserva],
      [datos.unidad],
      [datos.pasajero],
      datos.pagos,
    )[0];
    this.enlaceWhatsapp = this.reservaService.enlaceWhatsapp(this.datos, this.sena);
    this.pagoForm.reset({ monto: '', fecha: this.hoy(), medio_pago: 'Transferencia' });
    this.procesando = false;
    this.cd.markForCheck();
  }

  // La seña es el primer pago (los pagos llegan ordenados por fecha)
  get sena(): number {
    return this.pagos.length > 0 ? this.pagos[0].monto : 0;
  }

  get estado(): string {
    return this.datos?.reserva.estado ?? '';
  }

  // ========== HU-06: REGISTRAR LA SEÑA O UN PAGO ==========
  registrarPago(): void {
    if (!this.datos) {
      return;
    }
    const valores = this.pagoForm.getRawValue();
    const monto = Number(valores.monto);

    if (this.pagoForm.invalid || monto <= 0) {
      this.error = 'Ingresá un monto mayor a 0, la fecha y el medio de pago.';
      return;
    }
    // El saldo se calcula como importe acordado menos los pagos: no se admite superarlo
    if (monto > this.datos.saldo) {
      this.error = `El pago supera el saldo pendiente (${this.reservaService.formatoMoneda(this.datos.saldo)}).`;
      return;
    }

    const eraSena = this.estado === 'Pendiente de seña';
    this.ejecutar(
      this.pagoService.crear({
        id_reserva: Number(this.id),
        monto,
        fecha: valores.fecha,
        medio_pago: valores.medio_pago,
      }),
      eraSena
        ? 'Seña registrada: la reserva quedó Confirmada y ya no vence.'
        : 'Pago registrado.',
    );
  }

  // ========== HU-07: EXTENDER LA FECHA LÍMITE ==========
  extenderPlazo(): void {
    const { fechaLimite } = this.plazoForm.getRawValue();
    if (!fechaLimite) {
      this.error = 'Elegí la nueva fecha y hora límite.';
      return;
    }
    this.ejecutar(
      this.reservaService.extenderPlazo(Number(this.id), fechaLimite),
      'Fecha límite extendida.',
    );
  }

  // ========== HU-08: CHECK-IN ==========
  // Si hay saldo, se puede cobrar antes con el formulario de pagos o seguir
  // con la deuda previa confirmación explícita.
  checkin(): void {
    if (!this.datos) {
      return;
    }
    if (this.datos.saldo > 0) {
      const continuar = confirm(
        `El pasajero tiene un saldo pendiente de ${this.reservaService.formatoMoneda(this.datos.saldo)}.\n\n` +
          'Aceptar: registrar el ingreso igual, con la deuda.\n' +
          'Cancelar: volver y registrar el cobro primero.',
      );
      if (!continuar) {
        return;
      }
    } else if (!confirm('¿Registrar el ingreso del pasajero?')) {
      return;
    }
    this.ejecutar(
      this.reservaService.cambiarEstado(Number(this.id), 'En curso'),
      'Check-in registrado: la reserva está En curso y la unidad pasó a Ocupada.',
    );
  }

  // ========== HU-09: CHECK-OUT ==========
  checkout(): void {
    if (!this.datos) {
      return;
    }
    const aviso =
      this.datos.saldo > 0
        ? `Atención: queda un saldo pendiente de ${this.reservaService.formatoMoneda(this.datos.saldo)}. ` +
          'La deuda va a seguir visible en el listado de reservas.\n\n'
        : '';
    if (!confirm(`${aviso}¿Registrar el egreso del pasajero?`)) {
      return;
    }
    this.ejecutar(
      this.reservaService.cambiarEstado(Number(this.id), 'Finalizada'),
      'Check-out registrado: la reserva está Finalizada y la unidad pasó a En limpieza.',
    );
  }

  // ========== HU-05: CANCELAR ==========
  cancelar(): void {
    if (!confirm(`¿Cancelar la reserva N° ${this.id}? Sus fechas quedan libres y se conservan los pagos.`)) {
      return;
    }
    this.ejecutar(
      this.reservaService.cambiarEstado(Number(this.id), 'Cancelada'),
      'Reserva cancelada.',
    );
  }

  // Lanza la acción y, cuando termina, vuelve a pedir la reserva actualizada
  private ejecutar(accion: Observable<unknown>, mensajeOk: string): void {
    this.error = '';
    this.mensaje = '';
    this.procesando = true;
    accion.pipe(switchMap(() => this.pedirDatos())).subscribe({
      next: (datos) => {
        this.mostrar(datos);
        this.mensaje = mensajeOk;
        this.cd.markForCheck();
      },
      error: (error) => this.fallar(error),
    });
  }

  private hoy(): string {
    const hoy = new Date();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${hoy.getFullYear()}-${mes}-${dia}`;
  }

  private fallar(error: Error): void {
    this.error = error.message;
    this.procesando = false;
    this.cd.markForCheck();
  }
}
