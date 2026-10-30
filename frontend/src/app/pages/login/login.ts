import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

// HU-01: el administrador inicia sesión con su correo y su contraseña.
@Component({
  imports: [ReactiveFormsModule],
  selector: 'app-login',
  styleUrl: './login.css',
  templateUrl: './login.html',
})
export class Login {
  private formbuilder = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private cd = inject(ChangeDetectorRef);

  errorLogin = '';
  ingresando = false;

  loginForm = this.formbuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  // ========== INICIAR SESIÓN ==========
  enviar() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.errorLogin = '';
    this.ingresando = true;
    const { email, password } = this.loginForm.getRawValue();

    this.authService.login(email, password).subscribe({
      // Si llega acá la API ya validó las credenciales
      next: (administrador) => {
        this.authService.guardarSesion(administrador);
        this.router.navigate(['/admin/reservas']);
      },
      // Credenciales inválidas: el mensaje no dice cuál de los datos está mal
      error: (error) => {
        this.errorLogin = error.message;
        this.ingresando = false;
        this.cd.markForCheck();
      },
    });
  }

  get Email() {
    return this.loginForm.get('email');
  }

  get Password() {
    return this.loginForm.get('password');
  }
}
