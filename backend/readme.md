# Backend - MVP Complejo El Cuadrado

API REST del sistema de gestión de reservas del Complejo El Cuadrado,
desarrollada con **Django** y **Django REST Framework** sobre **MySQL**.
La consume la SPA de Angular de la carpeta `frontend`.

El modelo de datos está en `../docs/MR.md` y el diagrama en `../docs/DER.png`.
Las reglas citadas como R1 a R14 son las de `docs/MR.md`, sección 4.

---

## 🧩 Estructura: una aplicación por componente

| Aplicación        | Responsabilidad                                         | Tabla           | HU                  | Depende de               |
| ----------------- | ------------------------------------------------------- | --------------- | ------------------- | ------------------------ |
| `administradores` | Inicio de sesión del único perfil                       | `administrador` | HU-01               | —                        |
| `unidades`        | Unidades (aparts) y su estado                           | `unidad`        | HU-02               | —                        |
| `pasajeros`       | Titular de cada reserva                                 | `pasajero`      | HU-04               | —                        |
| `reservas`        | Disponibilidad, reservas, cancelación, vencimiento, check-in y check-out | `reserva` | HU-03 a HU-05, HU-07 a HU-09 | `unidades`, `pasajeros` |
| `pagos`           | Seña y pagos posteriores                                | `pago`          | HU-06               | `reservas`               |

```
backend/
├── manage.py
├── requirements.txt
├── .env.example                ← copiar como .env
├── database/
│   └── complejo_el_cuadrado.sql ← crea la base con datos de prueba
├── complejo_el_cuadrado/       ← proyecto: settings.py, urls.py, validacion.py
├── administradores/            ← models.py, serializers.py, views.py, urls.py, admin.py
├── unidades/
├── pasajeros/
├── reservas/
└── pagos/
```

Flujo de cada pedido: **urls.py → vista (APIView) → serializer → modelo → MySQL**,
y la respuesta vuelve en JSON.

### Dónde está cada regla

- **En el modelo (`clean()`)**: lo que se valida al guardar, por ejemplo la superposición
  de reservas en `Reserva.clean()` o el saldo en `Pago.clean()`. El mixin
  `complejo_el_cuadrado/validacion.py` hace que DRF lo ejecute y devuelva 400.
- **En métodos del modelo**: los cambios de estado y sus efectos
  (`Reserva.cambiar_estado()`, `Unidad.validar_cambio_manual()`), el plazo de la seña
  (`calcular_limite_pago()`, `extender_plazo()`) y el saldo (`saldo()`).
- **Vencimiento (R7)**: `vencer_reservas_pendientes()` en `reservas/models.py`. Se llama
  antes de responder el listado, el detalle, la disponibilidad, el alta y los pagos:
  una reserva vencida nunca se muestra ni bloquea fechas, sin tareas programadas.
- **Plazo de la seña**: `PLAZO_SENA_HORAS = 48` en `settings.py`.

---

## ⚙️ Requisitos

- Python 3.10 o superior
- MySQL 8 (o MariaDB 10.5+) con MySQL Workbench o la consola `mysql`

---

## 🚀 Instalación y ejecución

Comandos para **Git Bash** en Windows, desde la carpeta `backend`.

1. **Crear y activar el entorno virtual**

   ```bash
   python -m venv venv
   source venv/Scripts/activate
   ```

2. **Instalar las dependencias**

   ```bash
   pip install -r requirements.txt
   ```

3. **Configurar la conexión**: copiar `.env.example` como `.env` y completar la contraseña de MySQL.

   ```bash
   cp .env.example .env
   ```

4. **Crear la base con el script** (vía oficial: la estructura coincide con el MR).
   Desde MySQL Workbench: abrir `database/complejo_el_cuadrado.sql` y ejecutarlo.
   Desde la consola:

   ```bash
   mysql -u root -p < database/complejo_el_cuadrado.sql
   ```

   Dos problemas comunes en Git Bash:
   - Si se queda esperando y nunca pide la contraseña, pasala pegada al `-p`:
     `mysql -u root -p'tu_contraseña' < database/complejo_el_cuadrado.sql`
   - Si dice `mysql: command not found`, usá la ruta completa, por ejemplo
     `"/c/Program Files/MySQL/MySQL Server 8.0/bin/mysql" -u root -p < database/complejo_el_cuadrado.sql`

5. **Registrar las migraciones** sin volver a crear las tablas del script,
   y crear las tablas internas de Django (sesiones, panel /admin/):

   ```bash
   python manage.py migrate --fake-initial
   ```

6. **Levantar el servidor**

   ```bash
   python manage.py runserver
   ```

   La API queda en `http://localhost:8000/api/v1/`.

**Usuario de prueba:** `admin@elcuadrado.com` / `admin123`

Para volver a los datos de prueba (con el backend frenado), desde `backend` y con el
`venv` activo. El detalle de qué se borra y qué queda está en el `README.md` de la raíz,
sección "Volver la base de datos al estado inicial".

```bash
mysql -u root -p -e "DROP DATABASE IF EXISTS complejo_el_cuadrado; SOURCE database/complejo_el_cuadrado.sql;"
python manage.py migrate --fake-initial
```

Las fechas de los datos de prueba se calculan desde el día
en que se corre el script, así siempre hay una reserva en curso, una pendiente y una vencida.

---

## 🔌 Endpoints

Todas las rutas van sin barra final.

| Método | Ruta | Uso | HU |
| --- | --- | --- | --- |
| POST | `/login` | `{email, clave_acceso}` → 200 con el administrador, o 401 | HU-01 |
| GET | `/unidades` | Listado. Filtro `?estado=` | HU-02 |
| POST | `/unidades` | Alta. Queda Disponible | HU-02 |
| GET, PUT, PATCH | `/unidades/<id>` | Detalle y modificación. `PATCH {"estado": ...}` cambia el estado con las reglas del MR | HU-02 |
| GET | `/pasajeros` | Filtros `?dni=` (exacto) y `?apellido=` (contiene) | HU-04 |
| POST | `/pasajeros` | Alta del titular | HU-04 |
| GET, PUT, PATCH | `/pasajeros/<id>` | Detalle y corrección de datos | HU-04 |
| GET | `/disponibilidad?ingreso=&egreso=&huespedes=` | Unidades libres para esas fechas | HU-03 |
| GET | `/reservas` | Listado. Filtros `?estado=`, `?id_unidad=`, `?id_pasajero=`, `?apellido=`, `?dni=` | HU-05 |
| POST | `/reservas` | Alta: queda Pendiente de seña con su fecha límite | HU-04 |
| GET | `/reservas/<id>` | Detalle | HU-05 |
| PATCH | `/reservas/<id>` | `{"estado": "Cancelada"}`, `{"estado": "En curso"}` (check-in), `{"estado": "Finalizada"}` (check-out) o `{"fecha_limite_pago": ...}` (extender plazo) | HU-05, 07, 08, 09 |
| GET | `/pagos` | Filtro `?id_reserva=` | HU-06 |
| POST | `/pagos` | Registra un pago; si la reserva estaba pendiente, es la seña y la confirma | HU-06 |

**No hay DELETE**: el MVP no borra unidades, pasajeros, reservas ni pagos. Una unidad
fuera de servicio pasa a En mantenimiento y una reserva se cancela conservando sus pagos.

### Códigos de respuesta

| Código | Cuándo |
| --- | --- |
| 200 / 201 | Consulta o modificación correcta / alta correcta |
| 400 | Datos inválidos o regla de negocio incumplida. El cuerpo es `{campo: [mensaje]}` |
| 401 | Login con credenciales incorrectas |
| 404 | El registro no existe |
| 405 | Método no permitido (por ejemplo, DELETE) |
| 500 | Error interno: `{"detalle": "Error interno del servidor."}` |

---

## ⚠️ Límites conocidos (fuera del alcance de la cursada)

- La API no exige token: cualquiera que conozca la URL puede consultarla. El acceso
  se controla en las pantallas del frontend.
- Las claves se guardan sin hash, igual que en la consigna de Programación II.
