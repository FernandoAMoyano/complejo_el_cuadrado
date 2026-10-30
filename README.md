# Complejo El Cuadrado · Gestión de reservas (MVP)

Práctica Profesionalizante · Tecnicatura Superior en Desarrollo de Software (ISPC)

Sistema web para que el administrador del **Complejo El Cuadrado** (Valle Hermoso,
Córdoba) gestione la disponibilidad de sus aparts, las reservas, las señas y los
pagos, el check-in y el check-out, y la comunicación con los pasajeros por WhatsApp.
Corresponde al MVP de la Tabla 18 del documento del proyecto (HU-01 a HU-10).

## 🧭 Alcance (Tabla 18)

| Módulo | Funcionalidades | HU | Pantalla |
| --- | --- | --- | --- |
| Acceso | Inicio y cierre de sesión del administrador | HU-01 | Login · menú lateral |
| Unidades | Alta, modificación y consulta. Estados: Disponible, Ocupada, En limpieza y En mantenimiento | HU-02 | Unidades |
| Reservas | Disponibilidad, registro con validación de superposición, listado con filtros, cancelación y vencimiento automático | HU-03, 04, 05, 07 | Disponibilidad · Nueva reserva · Reservas |
| Seña y saldo | Registro de la seña (confirma la reserva) y de los pagos, con el saldo | HU-06 | Detalle de la reserva |
| Estadía | Check-in, check-out y estado de las unidades durante la limpieza | HU-08, HU-09 | Detalle de la reserva · Unidades |
| Comunicación | Enlace de WhatsApp con mensaje prearmado | HU-10 | Detalle de la reserva |

## 📂 Estructura

```
App_Practica_profesionalizante/
├── docs/
│   ├── DER.wsd / DER.png   ← diagrama entidad-relación
│   └── MR.md               ← modelo relacional, estados, reglas R1 a R18 y decisiones
├── backend/                ← API REST: Django + Django REST Framework + MySQL
└── frontend/               ← SPA: Angular 22 + Bootstrap 5
```

## 🛠️ Tecnologías

- **Frontend:** Angular 22 (componentes standalone, formularios reactivos, RxJS), Bootstrap 5, TypeScript
- **Backend:** Python, Django 5.2, Django REST Framework
- **Base de datos:** MySQL 8 (o MariaDB)

## ▶️ Cómo levantarlo

Requisitos: Python 3.10+, Node.js 20+ y MySQL 8.

Los comandos son para **Git Bash** en Windows.

1. **Backend** (detalle en `backend/readme.md`), desde la carpeta `backend`:

   ```bash
   python -m venv venv
   source venv/Scripts/activate
   pip install -r requirements.txt
   cp .env.example .env            # completar la contraseña de MySQL en .env
   mysql -u root -p < database/complejo_el_cuadrado.sql
   python manage.py migrate --fake-initial
   python manage.py runserver
   ```

   Si `mysql` no pide la contraseña o no se encuentra, ver "Dos problemas comunes en Git Bash"
   en `backend/readme.md`.

2. **Frontend**, desde la carpeta `frontend` en otra terminal de Git Bash:

   ```bash
   npm install
   npm start
   ```

3. Abrir `http://localhost:4200` e iniciar sesión con el usuario de prueba.

## 🔑 Usuario de prueba

El MVP tiene un único perfil (administrador/propietario). La cuenta la crea el script
`backend/database/complejo_el_cuadrado.sql`: no hay registro desde la aplicación.

| Rol | Nombre | Correo electrónico | Contraseña |
| --- | --- | --- | --- |
| Administrador | Administrador El Cuadrado | `admin@elcuadrado.com` | `admin123` |

## 🧪 Datos de prueba

Las fechas se calculan desde el día en que se corre el script SQL, así siempre sirven
para la demo:

- **Unidades:** Apart 1 a Apart 5, que cubren los cuatro estados (Ocupada, Disponible,
  En limpieza y En mantenimiento).
- **Reservas:** una en cada estado: Finalizada sin saldo, En curso con deuda, Confirmada
  con seña, Pendiente de seña, una pendiente **ya vencida** (pasa a Cancelada al abrir
  el listado, HU-07) y una Cancelada por el administrador.
- **Pasajeros:** seis titulares con datos ficticios.

## ⚠️ Límites conocidos

- La sesión vive en memoria: al recargar la página (F5) hay que volver a iniciar sesión.
- La API no exige token (mismo alcance que en Programación II): las pantallas sí
  están protegidas por la sesión.
- El sistema no envía mensajes de WhatsApp: abre el chat con el mensaje armado y el
  administrador lo revisa y lo envía (HU-10).
