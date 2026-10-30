import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

// Menú lateral y contenedor de todas las pantallas de gestión.
// HU-01: ninguna pantalla se muestra sin sesión iniciada. La sesión vive en
// memoria (AuthService): al recargar la página hay que volver a iniciarla.
@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-admin-layout',
  styleUrl: './layout.css',
  templateUrl: './layout.html',
})
export class AdminLayout implements OnInit {
  protected authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    if (!this.authService.administradorActual) {
      this.router.navigate(['/login']);
    }
  }

  // HU-01: cierre de sesión
  cerrarSesion(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
