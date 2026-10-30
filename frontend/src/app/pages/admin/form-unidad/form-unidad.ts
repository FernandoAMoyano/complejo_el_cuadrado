import { ChangeDetectorRef, Component, Input, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { UnidadService } from '../../../services/unidad.service';
import { Unidad } from '../../../models/unidad';

// HU-02: alta y modificación de una unidad. Un solo componente en dos modos:
// sin id en la ruta es alta, con id es edición. El estado no se carga acá:
// la unidad nueva queda Disponible y después cambia con las acciones.
@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-form-unidad',
  styleUrl: './form-unidad.css',
  templateUrl: './form-unidad.html',
})
export class FormUnidad implements OnInit {
  @Input() id = '';

  private fb = inject(FormBuilder);
  private router = inject(Router);
  private unidadService = inject(UnidadService);
  private cd = inject(ChangeDetectorRef);

  error = '';
  guardando = false;

  form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(30)]],
    capacidad: ['2', [Validators.required]],
    descripcion: ['', [Validators.maxLength(500)]],
  });

  ngOnInit(): void {
    if (this.id) {
      this.unidadService.obtener(this.id).subscribe({
        next: (unidad) => {
          this.form.patchValue({
            nombre: unidad.nombre,
            capacidad: String(unidad.capacidad),
            descripcion: unidad.descripcion ?? '',
          });
          this.cd.markForCheck();
        },
        error: (error) => this.fallar(error),
      });
    }
  }

  // ========== GUARDAR ==========
  guardar(): void {
    this.error = '';
    const valores = this.form.getRawValue();
    const nombre = valores.nombre.trim();

    if (this.form.invalid || !nombre) {
      this.form.markAllAsTouched();
      this.error = 'Completá el nombre y elegí una capacidad de 1 a 4 huéspedes.';
      return;
    }

    this.guardando = true;
    const datos: Unidad = {
      nombre,
      capacidad: Number(valores.capacidad),
      descripcion: valores.descripcion.trim() || null,
    };

    // El backend valida el nombre único y que la capacidad no quede por debajo
    // de los huéspedes de una reserva activa: si no, responde 400 con el motivo.
    const pedido: Observable<Unidad> = this.id
      ? this.unidadService.actualizar(this.id, datos)
      : this.unidadService.crear(datos);

    pedido.subscribe({
      next: () => this.router.navigate(['/admin/unidades']),
      error: (error) => this.fallar(error),
    });
  }

  private fallar(error: Error): void {
    this.error = error.message;
    this.guardando = false;
    this.cd.markForCheck();
  }
}
