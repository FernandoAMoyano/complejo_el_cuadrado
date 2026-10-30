import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(), // captura errores no manejados del navegador
    provideRouter(routes, withComponentInputBinding()), // router + params de URL → @Input
    provideHttpClient(), // habilita inyectar HttpClient
  ],
};
