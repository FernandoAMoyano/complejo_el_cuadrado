import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UnidadService } from '../../../services/unidad.service';
import { Unidad } from '../../../models/unidad';

// HU-02: consulta de las unidades con su estado actual y las acciones rápidas
// de estado. Una unidad Ocupada no se cambia a mano: se libera con el check-out.
@Component({
  imports: [RouterLink],
  selector: 'app-unidades',
  styleUrl: './unidades.css',
  templateUrl: './unidades.html',
})
export class Unidades implements OnInit {
  protected unidadService = inject(UnidadService);
  private cd = inject(ChangeDetectorRef);

  unidades: Unidad[] = [];
  cargado = false;
  error = '';
  cambiando = false;

  ngOnInit(): void {
    this.unidadService.listar().subscribe({
      next: (unidades) => {
        this.unidades = unidades;
        this.cargado = true;
        this.cd.markForCheck();
      },
      error: (error) => this.fallar(error),
    });
  }

  // Los contadores se calculan sobre el array recibido: no hay ningún total guardado
  contar(estado: string): number {
    return this.unidades.filter((unidad) => unidad.estado === estado).length;
  }

  // ========== ACCIONES RÁPIDAS DE ESTADO ==========
  // En limpieza → Disponible con una sola acción; cualquier no ocupada → En mantenimiento
  cambiarEstado(unidad: Unidad, estado: string): void {
    this.error = '';
    this.cambiando = true;
    this.unidadService.cambiarEstado(Number(unidad.id), estado).subscribe({
      next: (actualizada) => {
        // No se vuelve a consultar la API: se reemplaza la fila que ya está en memoria
        this.unidades = this.unidades.map((u) => (u.id === actualizada.id ? actualizada : u));
        this.cambiando = false;
        this.cd.markForCheck();
      },
      error: (error) => this.fallar(error),
    });
  }

  private fallar(error: Error): void {
    this.error = error.message;
    this.cambiando = false;
    this.cd.markForCheck();
  }
}
