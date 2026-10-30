import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Inicia la aplicación Angular sin un NgModule:
// recibe el componente raíz standalone que se
// renderizará (App) y la configuración global (appConfig),
// como proveedores.
bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
