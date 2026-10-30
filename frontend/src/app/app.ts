import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

// Componente raíz: solo aloja el router. Toda la app es del administrador,
// así que no hay navbar pública ni footer: el menú está en el layout del admin.
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
