import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UnidadService } from '../../../services/unidad.service';
import { Unidad } from '../../../models/unidad';

// HU-03: qué unidades están libres entre dos fechas para una cantidad de
// huéspedes. Es el primer paso para registrar una reserva (HU-04).
@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-disponibilidad',
  styleUrl: './disponibilidad.css',
  templateUrl: './disponibilidad.html',
})
export class Disponibilidad {
  private fb = inject(FormBuilder);
  protected unidadService = inject(UnidadService);
  private cd = inject(ChangeDetectorRef);

  unidades: Unidad[] = [];
  buscado = false;
  error = '';

  // Viajan en la URL hacia la pantalla de nueva reserva
  filtros = { ingreso: '', egreso: '', huespedes: '2' };

  buscador = this.fb.nonNullable.group({
    ingreso: ['', [Validators.required]],
    egreso: ['', [Validators.required]],
    huespedes: ['2', [Validators.required]],
  });

  // ========== CONSULTAR DISPONIBILIDAD ==========
  buscar(): void {
    this.error = '';
    const { ingreso, egreso, huespedes } = this.buscador.getRawValue();

    if (!ingreso || !egreso) {
      this.error = 'Elegí la fecha de ingreso y la de egreso.';
      return;
    }

    // HU-03: si el egreso no es posterior al ingreso se informa (el backend también lo valida)
    if (egreso <= ingreso) {
      this.error = 'La fecha de egreso debe ser posterior a la de ingreso.';
      return;
    }

    // El backend descarta las unidades en mantenimiento, sin capacidad suficiente
    // o con una reserva activa superpuesta (R5). Las pendientes vencidas no cuentan.
    this.unidadService.listarDisponibles(ingreso, egreso, Number(huespedes)).subscribe({
      next: (unidades) => {
        this.unidades = unidades;
        this.filtros = { ingreso, egreso, huespedes };
        this.buscado = true;
        this.cd.markForCheck();
      },
      error: (error) => {
        this.error = error.message;
        this.cd.markForCheck();
      },
    });
  }
}
