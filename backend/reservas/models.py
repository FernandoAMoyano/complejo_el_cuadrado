"""
Componente Reservas: el registro de cada reserva y su ciclo de vida
(HU-03, HU-04, HU-05, HU-07, HU-08 y HU-09). Depende de Unidades y Pasajeros.

Tabla, columnas, tipos y largos según el Modelo Relacional (docs/MR.md).
Las reglas R1 a R14 citadas en los comentarios son las de docs/MR.md, sección 4.
"""
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models

from pasajeros.models import Pasajero
from unidades.models import DISPONIBLE, EN_LIMPIEZA, EN_MANTENIMIENTO, OCUPADA, Unidad

PENDIENTE = 'Pendiente de seña'
CONFIRMADA = 'Confirmada'
EN_CURSO = 'En curso'
FINALIZADA = 'Finalizada'
CANCELADA = 'Cancelada'

# R1: las reservas activas son las que ocupan fechas de la unidad
ACTIVAS = [PENDIENTE, CONFIRMADA, EN_CURSO]

MOTIVO_ADMINISTRADOR = 'Cancelada por el administrador'
MOTIVO_VENCIDA = 'Vencida por falta de seña'

# Cambios de estado que se piden con PATCH (MR, sección 3). Pendiente de seña
# a Confirmada no está: esa transición la hace el registro de la seña (HU-06).
TRANSICIONES = {
    PENDIENTE: [CANCELADA],
    CONFIRMADA: [EN_CURSO, CANCELADA],
    EN_CURSO: [FINALIZADA],
    FINALIZADA: [],
    CANCELADA: [],
}


def formato_fecha(fecha):
    return fecha.strftime('%d/%m/%Y')


class Reserva(models.Model):
    ESTADOS = [
        (PENDIENTE, PENDIENTE),
        (CONFIRMADA, CONFIRMADA),
        (EN_CURSO, EN_CURSO),
        (FINALIZADA, FINALIZADA),
        (CANCELADA, CANCELADA),
    ]

    id = models.AutoField(primary_key=True, db_column='id_reserva')
    # PROTECT: no se borra una unidad ni un pasajero con reservas (ON DELETE RESTRICT)
    id_unidad = models.ForeignKey(
        Unidad,
        on_delete=models.PROTECT,
        db_column='id_unidad',
        related_name='reservas',
    )
    id_pasajero = models.ForeignKey(
        Pasajero,
        on_delete=models.PROTECT,
        db_column='id_pasajero',
        related_name='reservas',
    )
    fecha_ingreso = models.DateField()
    fecha_egreso = models.DateField()
    cantidad_huespedes = models.IntegerField(
        validators=[MinValueValidator(1, 'La reserva debe tener al menos 1 huésped.')]
    )
    # Importe pactado con el pasajero: no hay tarifas automáticas (apartado 4.5)
    importe_acordado = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'), 'El importe acordado debe ser mayor a 0.')],
    )
    estado = models.CharField(max_length=20, choices=ESTADOS, default=PENDIENTE)
    # auto_now_add: Django completa la fecha y hora al crear la reserva
    fecha_registro = models.DateTimeField(auto_now_add=True)
    fecha_limite_pago = models.DateTimeField(blank=True, null=True)
    motivo_cancelacion = models.CharField(max_length=100, blank=True, null=True)
    fecha_hora_checkin = models.DateTimeField(blank=True, null=True)
    fecha_hora_checkout = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'reserva'
        verbose_name = 'reserva'
        verbose_name_plural = 'reservas'
        ordering = ['fecha_ingreso', 'id']

    def __str__(self):
        return f'Reserva {self.pk} - {self.id_unidad} ({self.fecha_ingreso} a {self.fecha_egreso})'

    # ========== VALIDACIÓN DEL ALTA (HU-04) ==========
    def clean(self):
        """
        Reglas que se validan al registrar la reserva:
        1. El egreso tiene que ser posterior al ingreso.
        2. El ingreso no puede ser anterior a hoy (R15).
        3. Los huéspedes no pueden superar la capacidad de la unidad (R4).
        4. No se reserva una unidad en mantenimiento (R4).
        5. No puede superponerse con otra reserva activa de la misma unidad,
           y el mensaje indica con cuál (R2, R3).
        """
        errores = {}

        if self.fecha_ingreso and self.fecha_egreso and self.fecha_egreso <= self.fecha_ingreso:
            errores['fecha_egreso'] = 'La fecha de egreso debe ser posterior a la de ingreso.'

        # R15: una reserva en el pasado vencería apenas se registra
        if self.pk is None and self.fecha_ingreso and self.fecha_ingreso < date.today():
            errores['fecha_ingreso'] = 'La fecha de ingreso no puede ser anterior a hoy.'

        # id_unidad_id es el número guardado en la columna id_unidad
        unidad = None
        if self.id_unidad_id:
            unidad = Unidad.objects.filter(pk=self.id_unidad_id).first()

        if unidad and self.cantidad_huespedes and self.cantidad_huespedes > unidad.capacidad:
            errores['cantidad_huespedes'] = (
                f'La unidad {unidad.nombre} admite como máximo {unidad.capacidad} huéspedes.'
            )

        if unidad and self.pk is None and unidad.estado == EN_MANTENIMIENTO:
            errores['id_unidad'] = f'La unidad {unidad.nombre} está en mantenimiento y no se puede reservar.'

        # Dos rangos se superponen cuando ingreso_nuevo < egreso_existente y
        # egreso_nuevo > ingreso_existente: si uno ingresa el día que el otro
        # egresa, no hay superposición (R2).
        if unidad and self.estado in ACTIVAS and self.fecha_ingreso and self.fecha_egreso \
                and 'fecha_egreso' not in errores and 'fecha_ingreso' not in errores:
            # Una pendiente vencida no bloquea las fechas (R7)
            vencer_reservas_pendientes()
            superpuesta = (
                Reserva.objects.filter(
                    id_unidad=unidad,
                    estado__in=ACTIVAS,
                    fecha_ingreso__lt=self.fecha_egreso,
                    fecha_egreso__gt=self.fecha_ingreso,
                )
                .exclude(pk=self.pk)
                .first()
            )
            if superpuesta:
                errores['fecha_ingreso'] = (
                    f'La unidad {unidad.nombre} ya tiene la reserva N° {superpuesta.pk} '
                    f'de {superpuesta.id_pasajero.apellido} '
                    f'del {formato_fecha(superpuesta.fecha_ingreso)} al {formato_fecha(superpuesta.fecha_egreso)} '
                    f'({superpuesta.estado}).'
                )

        if errores:
            raise ValidationError(errores)

    # ========== PLAZO DE LA SEÑA (HU-07) ==========
    def fin_del_dia_de_ingreso(self):
        return datetime.combine(self.fecha_ingreso, time(23, 59, 59))

    def calcular_limite_pago(self):
        """R6: el menor entre (registro + plazo) y el final del día de ingreso."""
        limite = self.fecha_registro + timedelta(hours=settings.PLAZO_SENA_HORAS)
        return min(limite, self.fin_del_dia_de_ingreso())

    def extender_plazo(self, nueva_fecha):
        """R8: el administrador extiende la fecha límite, sin pasar el día de ingreso."""
        if self.estado != PENDIENTE:
            raise ValidationError({
                'fecha_limite_pago': 'Solo se extiende el plazo de una reserva pendiente de seña.'
            })
        if nueva_fecha <= self.fecha_limite_pago:
            raise ValidationError({
                'fecha_limite_pago': 'La nueva fecha límite tiene que ser posterior a la actual.'
            })
        if nueva_fecha > self.fin_del_dia_de_ingreso():
            raise ValidationError({
                'fecha_limite_pago': (
                    f'La fecha límite no puede pasar el día de ingreso ({formato_fecha(self.fecha_ingreso)}).'
                )
            })
        self.fecha_limite_pago = nueva_fecha
        self.save()

    # ========== SALDO (HU-06) ==========
    def total_pagado(self):
        # related_name='pagos' en Pago.id_reserva
        total = Decimal('0')
        for pago in self.pagos.all():
            total += pago.monto
        return total

    def saldo(self):
        """R9: importe acordado menos los pagos registrados."""
        return self.importe_acordado - self.total_pagado()

    # ========== CAMBIOS DE ESTADO (HU-05, HU-08, HU-09) ==========
    def cambiar_estado(self, nuevo_estado):
        """
        Aplica un cambio de estado permitido por TRANSICIONES y sus efectos:
        - Cancelada: guarda el motivo y libera las fechas (deja de ser activa).
        - En curso (check-in): desde el día de ingreso (R16), con la unidad
          Disponible (R12), que pasa a Ocupada.
        - Finalizada (check-out): la unidad pasa a En limpieza.
        """
        if nuevo_estado not in TRANSICIONES.get(self.estado, []):
            if self.estado == PENDIENTE and nuevo_estado == CONFIRMADA:
                mensaje = 'Una reserva pendiente se confirma registrando la seña.'
            else:
                mensaje = f'Una reserva {self.estado} no puede pasar a {nuevo_estado}.'
            raise ValidationError({'estado': mensaje})

        ahora = datetime.now()
        unidad = self.id_unidad

        if nuevo_estado == EN_CURSO:
            # R16: sin esto, una reserva del mes que viene ocuparía la unidad hoy
            if date.today() < self.fecha_ingreso:
                raise ValidationError({
                    'estado': f'El check-in se registra a partir del día de ingreso ({formato_fecha(self.fecha_ingreso)}).'
                })
            if unidad.estado != DISPONIBLE:
                raise ValidationError({
                    'estado': f'Para el check-in la unidad {unidad.nombre} tiene que estar Disponible (está {unidad.estado}).'
                })
            self.fecha_hora_checkin = ahora
            unidad.estado = OCUPADA

        if nuevo_estado == FINALIZADA:
            self.fecha_hora_checkout = ahora
            unidad.estado = EN_LIMPIEZA

        if nuevo_estado == CANCELADA:
            self.motivo_cancelacion = MOTIVO_ADMINISTRADOR
            self.fecha_limite_pago = None

        self.estado = nuevo_estado
        self.save()
        unidad.save()

    def confirmar_con_sena(self):
        """R10: con la seña, la pendiente pasa a Confirmada y deja de tener vencimiento."""
        if self.estado == PENDIENTE:
            self.estado = CONFIRMADA
            self.fecha_limite_pago = None
            self.save()


def vencer_reservas_pendientes():
    """
    R7: las reservas pendientes de seña con el plazo cumplido pasan a Cancelada
    con el motivo "Vencida por falta de seña", y así liberan sus fechas.

    Se llama al consultar (listado, detalle, disponibilidad, alta y pagos), así
    ninguna pantalla muestra ni bloquea una reserva vencida, sin necesidad de
    tareas programadas.
    """
    vencidas = Reserva.objects.filter(estado=PENDIENTE, fecha_limite_pago__lt=datetime.now())
    for reserva in vencidas:
        reserva.estado = CANCELADA
        reserva.motivo_cancelacion = MOTIVO_VENCIDA
        reserva.fecha_limite_pago = None
        reserva.save()
