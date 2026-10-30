import { ChangeDetectorRef, Component, Input, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable, of, switchMap } from 'rxjs';
import { UnidadService } from '../../../services/unidad.service';
import { PasajeroService } from '../../../services/pasajero.service';
import { ReservaService } from '../../../services/reserva.service';
import { Unidad } from '../../../models/unidad';
import { Pasajero } from '../../../models/pasajero';

// HU-04: registrar una reserva con fechas, unidad, huéspedes, datos del titular
// e importe acordado. Las fechas y los huéspedes llegan de la pantalla de
// disponibilidad por query params; la unidad, por la ruta nueva-reserva/:id.
@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-nueva-reserva',
  styleUrl: './nueva-reserva.css',
  templateUrl: './nueva-reserva.html',
})
export class NuevaReserva implements OnInit {
  // withComponentInputBinding() liga la ruta y los query params a estos @Input
  @Input() id = '';
  @Input() ingreso = '';
  @Input() egreso = '';
  @Input() huespedes = '1';

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private unidadService = inject(UnidadService);
  private pasajeroService = inject(PasajeroService);
  protected reservaService = inject(ReservaService);
  private cd = inject(ChangeDetectorRef);

  unidad: Unidad | null = null;
  // El pasajero que ya estaba registrado con ese DNI, si lo hay
  pasajeroExistente: Pasajero | null = null;
  dniBuscado = false;
  error = '';
  guardando = false;

  form = this.fb.nonNullable.group({
    dni: ['', [Validators.required]],
    nombre: ['', [Validators.required]],
    apellido: ['', [Validators.required]],
    telefono: ['', [Validators.required]],
    email: [''],
    importe: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.unidadService.obtener(this.id).subscribe({
      next: (unidad) => {
        this.unidad = unidad;
        this.cd.markForCheck();
      },
      error: (error) => this.fallar(error),
    });
  }

  get noches(): number {
    if (!this.ingreso || !this.egreso) {
      return 0;
    }
    const entrada = new Date(this.ingreso).getTime();
    const salida = new Date(this.egreso).getTime();
    return Math.round((salida - entrada) / (1000 * 60 * 60 * 24));
  }

  // ========== TITULAR ==========
  // El DNI es único: si el pasajero ya vino antes se reutilizan sus datos
  buscarPasajero(): void {
    const dni = this.form.controls.dni.value.trim();
    if (!dni) {
      this.error = 'Ingresá el DNI del titular.';
      return;
    }
    this.error = '';
    this.pasajeroService.buscarPorDni(dni).subscribe({
      next: (pasajeros) => {
        this.dniBuscado = true;
        if (pasajeros.length > 0) {
          this.usarPasajero(pasajeros[0]);
        } else {
          this.cargarPasajeroNuevo();
        }
        this.cd.markForCheck();
      },
      error: (error) => this.fallar(error),
    });
  }

  // Si se cambia el DNI después de buscarlo, hay que volver a buscar
  dniModificado(): void {
    if (this.dniBuscado) {
      this.dniBuscado = false;
      this.cargarPasajeroNuevo();
    }
  }

  private usarPasajero(pasajero: Pasajero): void {
    this.pasajeroExistente = pasajero;
    this.form.patchValue({
      nombre: pasajero.nombre,
      apellido: pasajero.apellido,
      telefono: pasajero.telefono,
      email: pasajero.email ?? '',
    });
    // Los datos de un pasajero registrado no se editan desde la reserva
    this.form.controls.nombre.disable();
    this.form.controls.apellido.disable();
    this.form.controls.telefono.disable();
    this.form.controls.email.disable();
  }

  private cargarPasajeroNuevo(): void {
    this.pasajeroExistente = null;
    this.form.patchValue({ nombre: '', apellido: '', telefono: '', email: '' });
    this.form.controls.nombre.enable();
    this.form.controls.apellido.enable();
    this.form.controls.telefono.enable();
    this.form.controls.email.enable();
  }

  // ========== REGISTRAR LA RESERVA ==========
  // Dos pedidos encadenados: el titular primero (se busca por DNI y, si no
  // existe, se crea) y la reserva después, porque necesita su id.
  registrar(): void {
    this.error = '';
    const valores = this.form.getRawValue();
    const importe = Number(valores.importe);

    if (!this.ingreso || !this.egreso || this.noches <= 0) {
      this.error = 'Volvé a Disponibilidad y elegí las fechas de la estadía.';
      return;
    }

    // HU-04: fechas, unidad, huéspedes, nombre y apellido, DNI, teléfono e importe son obligatorios
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error = 'Completá todos los datos obligatorios del titular y el importe acordado.';
      return;
    }

    if (importe <= 0) {
      this.error = 'El importe acordado debe ser mayor a 0.';
      return;
    }

    this.guardando = true;

    const datosPasajero: Pasajero = {
      dni: valores.dni.trim(),
      nombre: valores.nombre.trim(),
      apellido: valores.apellido.trim(),
      telefono: valores.telefono.trim(),
      email: valores.email.trim() || null,
    };

    // of() emite el pasajero que ya se encontró; si no, se busca y se crea
    const pasajero$: Observable<Pasajero> = this.pasajeroExistente
      ? of(this.pasajeroExistente)
      : this.pasajeroService
          .buscarPorDni(datosPasajero.dni)
          .pipe(
            switchMap((pasajeros) =>
              pasajeros.length > 0 ? of(pasajeros[0]) : this.pasajeroService.crear(datosPasajero),
            ),
          );

    // El backend revalida la superposición y la capacidad: si la rechaza,
    // responde 400 con el motivo e indica con qué reserva choca.
    pasajero$
      .pipe(
        switchMap((pasajero) =>
          this.reservaService.crear({
            id_unidad: Number(this.id),
            id_pasajero: Number(pasajero.id),
            fecha_ingreso: this.ingreso,
            fecha_egreso: this.egreso,
            cantidad_huespedes: Number(this.huespedes),
            importe_acordado: importe,
          }),
        ),
      )
      .subscribe({
        next: (creada) => this.router.navigate(['/admin/reserva', creada.id]),
        error: (error) => this.fallar(error),
      });
  }

  private fallar(error: Error): void {
    this.error = error.message;
    this.guardando = false;
    this.cd.markForCheck();
  }
}
