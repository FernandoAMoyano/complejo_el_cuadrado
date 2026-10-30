import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { AdminLayout } from './pages/admin/layout/layout';
import { Reservas } from './pages/admin/reservas/reservas';
import { Disponibilidad } from './pages/admin/disponibilidad/disponibilidad';
import { NuevaReserva } from './pages/admin/nueva-reserva/nueva-reserva';
import { DetalleReserva } from './pages/admin/detalle-reserva/detalle-reserva';
import { Unidades } from './pages/admin/unidades/unidades';
import { FormUnidad } from './pages/admin/form-unidad/form-unidad';

// Toda la app es del administrador (único perfil del MVP). Las pantallas de
// gestión cuelgan de /admin: el layout verifica la sesión antes de mostrarlas.
export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login, title: 'Iniciar sesión' },

  {
    path: 'admin',
    component: AdminLayout,
    children: [
      { path: '', redirectTo: 'reservas', pathMatch: 'full' },
      { path: 'reservas', component: Reservas, title: 'Reservas' },
      { path: 'reserva/:id', component: DetalleReserva, title: 'Detalle de la reserva' },
      { path: 'disponibilidad', component: Disponibilidad, title: 'Disponibilidad' },
      { path: 'nueva-reserva/:id', component: NuevaReserva, title: 'Nueva reserva' },
      { path: 'unidades', component: Unidades, title: 'Unidades' },
      { path: 'unidades/nueva', component: FormUnidad, title: 'Nueva unidad' },
      { path: 'unidades/:id/editar', component: FormUnidad, title: 'Editar unidad' },
    ],
  },

  // Cualquier otra ruta vuelve al inicio de sesión
  { path: '**', redirectTo: 'login' },
];
