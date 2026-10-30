# Modelo Relacional — MVP Complejo El Cuadrado

**Proyecto:** Práctica Profesionalizante · Tecnicatura Superior en Desarrollo de Software (ISPC)
**Alcance:** MVP de la Tabla 18 (HU-01 a HU-10). Único perfil: administrador/propietario.
**Diagrama:** `docs/DER.wsd` (imagen en `docs/DER.png`).

Base de datos: MySQL, `utf8mb4`. Nombre: `complejo_el_cuadrado`.

---

## 1. Tablas

### ADMINISTRADOR

| Campo | Tipo | Long | Nulo | Descripción |
| --- | --- | --- | --- | --- |
| id_administrador | INT | | NO | PK. Identificador interno del administrador. |
| nombre | VARCHAR | 50 | NO | Nombre de pila. |
| apellido | VARCHAR | 50 | NO | Apellido. |
| email | VARCHAR | 100 | NO | Correo de inicio de sesión. UNIQUE. |
| clave_acceso | VARCHAR | 100 | NO | Contraseña. Sin hash, igual que en la consigna de Programación II. |

Las cuentas se cargan con el script SQL: no hay registro desde la aplicación (no hay gestión de usuarios en el MVP).

### UNIDAD

| Campo | Tipo | Long | Nulo | Descripción |
| --- | --- | --- | --- | --- |
| id_unidad | INT | | NO | PK. Identificador interno de la unidad. |
| nombre | VARCHAR | 30 | NO | Identificación visible de la unidad (por ejemplo "Apart 1"). UNIQUE. |
| capacidad | INT | | NO | Máximo de huéspedes. CHECK entre 1 y 4. |
| estado | VARCHAR | 20 | NO | Valores: Disponible, Ocupada, En limpieza, En mantenimiento. Por defecto: Disponible. |
| descripcion | VARCHAR | 500 | SI | Texto libre que carga el administrador. |

### PASAJERO

Titular de la reserva. En el MVP solo se registran los datos del titular (apartado 4.5); el registro de todos los huéspedes es una mejora futura (Tabla 19).

| Campo | Tipo | Long | Nulo | Descripción |
| --- | --- | --- | --- | --- |
| id_pasajero | INT | | NO | PK. Identificador interno del pasajero. |
| nombre | VARCHAR | 50 | NO | Nombre de pila. |
| apellido | VARCHAR | 50 | NO | Apellido. Se usa en la búsqueda del listado de reservas (HU-05). |
| dni | VARCHAR | 8 | NO | Documento: 7 u 8 dígitos. UNIQUE: un pasajero que vuelve se reutiliza. |
| telefono | VARCHAR | 20 | NO | Teléfono de contacto: números, guiones, espacios y un `+` inicial. Se usa para el enlace de WhatsApp (HU-10). |
| email | VARCHAR | 100 | SI | Correo de contacto. Opcional. |

### RESERVA

| Campo | Tipo | Long | Nulo | Descripción |
| --- | --- | --- | --- | --- |
| id_reserva | INT | | NO | PK. Identificador interno de la reserva. |
| id_unidad | INT | | NO | FK → UNIDAD. Unidad reservada. |
| id_pasajero | INT | | NO | FK → PASAJERO. Titular de la reserva. |
| fecha_ingreso | DATE | | NO | Día de ingreso. |
| fecha_egreso | DATE | | NO | Día de egreso. CHECK: posterior a fecha_ingreso. |
| cantidad_huespedes | INT | | NO | CHECK ≥ 1. No supera la capacidad de la unidad (validación del modelo). |
| importe_acordado | DECIMAL | 10,2 | NO | Importe pactado con el pasajero. CHECK > 0. No se calcula: no hay tarifas automáticas (apartado 4.5). |
| estado | VARCHAR | 20 | NO | Valores: Pendiente de seña, Confirmada, En curso, Finalizada, Cancelada. Por defecto: Pendiente de seña. |
| fecha_registro | DATETIME | | NO | Momento en que se registró la reserva. |
| fecha_limite_pago | DATETIME | | SI | Plazo para pagar la seña. Solo tiene valor mientras la reserva está Pendiente de seña (HU-07). |
| motivo_cancelacion | VARCHAR | 100 | SI | Solo en reservas Canceladas: "Cancelada por el administrador" o "Vencida por falta de seña". |
| fecha_hora_checkin | DATETIME | | SI | Momento real del ingreso (HU-08). |
| fecha_hora_checkout | DATETIME | | SI | Momento real del egreso (HU-09). |

### PAGO

| Campo | Tipo | Long | Nulo | Descripción |
| --- | --- | --- | --- | --- |
| id_pago | INT | | NO | PK. Identificador interno del pago. |
| id_reserva | INT | | NO | FK → RESERVA. Reserva a la que corresponde. |
| monto | DECIMAL | 10,2 | NO | Importe del pago. CHECK > 0. |
| fecha | DATE | | NO | Día en que se cobró. |
| medio_pago | VARCHAR | 20 | NO | Valores: Efectivo, Transferencia. |

La seña no es un campo aparte: es el primer pago de la reserva, el que la pasa de Pendiente de seña a Confirmada.

---

## 2. Relaciones

| Relación | Cardinalidad | Al borrar el padre |
| --- | --- | --- |
| UNIDAD → RESERVA | 1 a N (una unidad tiene 0 o muchas reservas) | RESTRICT |
| PASAJERO → RESERVA | 1 a N (un pasajero es titular de 0 o muchas reservas) | RESTRICT |
| RESERVA → PAGO | 1 a N (una reserva tiene 0 o muchos pagos) | RESTRICT |

RESTRICT en las tres: las reservas canceladas conservan su registro y sus pagos (HU-05). En el MVP no se borran unidades, reservas ni pagos.

---

## 3. Estados y transiciones

### Reserva

| Desde | Hacia | Acción | HU |
| --- | --- | --- | --- |
| (alta) | Pendiente de seña | Registrar la reserva | HU-04 |
| Pendiente de seña | Confirmada | Registrar la seña (primer pago) | HU-06 |
| Pendiente de seña | Cancelada | Cancelar (administrador) o vencer el plazo sin seña | HU-05, HU-07 |
| Confirmada | Cancelada | Cancelar (administrador) | HU-05 |
| Confirmada | En curso | Registrar el check-in | HU-08 |
| En curso | Finalizada | Registrar el check-out | HU-09 |

Finalizada y Cancelada son estados finales.

### Unidad

| Desde | Hacia | Acción | HU |
| --- | --- | --- | --- |
| (alta) | Disponible | Dar de alta la unidad | HU-02 |
| Disponible | Ocupada | Solo con el check-in | HU-08 |
| Ocupada | En limpieza | Solo con el check-out | HU-09 |
| En limpieza | Disponible | Una sola acción del administrador | HU-02 |
| Disponible o En limpieza | En mantenimiento | Acción del administrador | HU-02 |
| En mantenimiento | Disponible | Acción del administrador | HU-02 |

Una unidad Ocupada no puede cambiarse a mano (HU-02).

---

## 4. Reglas de negocio

| # | Regla | HU |
| --- | --- | --- |
| R1 | Reserva activa = Pendiente de seña, Confirmada o En curso. | HU-03, HU-04 |
| R2 | Dos reservas se superponen si `ingreso_nueva < egreso_existente` y `egreso_nueva > ingreso_existente`. Si la nueva reserva ingresa el mismo día del egreso de otra, no hay superposición. | HU-03, HU-04 |
| R3 | No se registra una reserva superpuesta con otra activa de la misma unidad; el mensaje indica cuál. | HU-04 |
| R4 | No se reserva una unidad En mantenimiento ni con más huéspedes que su capacidad. | HU-03, HU-04 |
| R5 | Disponibilidad: capacidad suficiente, sin reservas activas superpuestas y no En mantenimiento. El estado actual Ocupada o En limpieza no impide reservar fechas futuras. | HU-03 |
| R6 | Al registrar la reserva: `fecha_limite_pago = menor entre (fecha_registro + plazo) y el final del día de ingreso`. Plazo por defecto: 48 horas. | HU-04, HU-07 |
| R7 | Una reserva Pendiente de seña con `fecha_limite_pago` vencida pasa a Cancelada con el motivo "Vencida por falta de seña" y libera las fechas. | HU-07 |
| R8 | El administrador puede extender la fecha límite, sin pasar el final del día de ingreso. | HU-07 |
| R9 | Saldo = `importe_acordado − suma de los pagos`. No se admite un pago mayor al saldo. | HU-06 |
| R10 | Con la seña, la reserva pasa a Confirmada y `fecha_limite_pago` queda vacía: deja de tener vencimiento. | HU-06, HU-07 |
| R11 | Solo se cancelan reservas Pendiente de seña o Confirmadas, con confirmación previa. | HU-05 |
| R12 | Check-in: solo reservas Confirmadas con la unidad Disponible. Si queda saldo, se cobra en el momento o se continúa con la deuda previa confirmación. | HU-08 |
| R13 | Check-out: solo reservas En curso. Si queda saldo, se advierte y la deuda sigue visible en el listado. | HU-09 |
| R14 | El enlace de WhatsApp se arma con el teléfono del pasajero; si el formato no es válido, se informa. El sistema no envía el mensaje. | HU-10 |
| R15 | La fecha de ingreso de una reserva nueva no puede ser anterior a hoy. | HU-04 |
| R16 | El check-in se registra a partir del día de ingreso de la reserva. | HU-08 |
| R17 | La fecha de un pago no puede ser posterior a hoy. | HU-06 |
| R18 | La capacidad de una unidad no puede bajar de la cantidad de huéspedes de sus reservas activas. | HU-02 |

R15 a R18 no figuran en los criterios de aceptación de las HU: el equipo las agregó para que el sistema no admita datos imposibles (una reserva en el pasado que vencería al instante, una unidad ocupada semanas antes de la llegada del pasajero, un pago con fecha futura o una reserva con más huéspedes que la capacidad).

---

## 5. Decisiones

| Decisión | Motivo |
| --- | --- |
| Estados y medio de pago como valores fijos (`choices` en Django + CHECK en MySQL), no como tablas | Cada estado dispara una regla del código (tabla de transiciones). Una tabla permitiría agregar estados que el sistema no sabe manejar. Es el mismo criterio de Programación II. |
| PASAJERO como tabla y no como columnas de RESERVA | El DNI único permite reutilizar al pasajero que vuelve y buscar por apellido o DNI (HU-05). Deja preparada la mejora futura de huéspedes. |
| ADMINISTRADOR sin relación con las demás tablas | El MVP tiene un único perfil y ninguna HU pide registrar quién hizo cada operación. |
| Plazo de la seña como constante (`PLAZO_SENA_HORAS = 48` en `settings.py`) | Cumple "por defecto 48 horas, configurable" sin pantalla de configuración, que no figura en el MVP. |
| Vencimiento "al consultar" | Las reservas vencidas se cancelan antes de responder el listado y la disponibilidad y antes de validar una superposición. Así nunca se muestra ni bloquea una reserva vencida, sin tareas programadas. |
| Sin borrado de unidades | La HU-02 pide alta, modificación y consulta. Una unidad fuera de servicio se pasa a En mantenimiento. |
