"""
Componente Pagos: la seña y los pagos posteriores de cada reserva (HU-06).
Depende del componente Reservas.

La seña no es un campo aparte: es el primer pago de una reserva pendiente,
el que la pasa a Confirmada (R10).
"""
from datetime import date
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models

from reservas.models import CANCELADA, Reserva


class Pago(models.Model):
    MEDIOS = [
        ('Efectivo', 'Efectivo'),
        ('Transferencia', 'Transferencia'),
    ]

    id = models.AutoField(primary_key=True, db_column='id_pago')
    # PROTECT: una reserva con pagos no se puede borrar
    id_reserva = models.ForeignKey(
        Reserva,
        on_delete=models.PROTECT,
        db_column='id_reserva',
        related_name='pagos',
    )
    monto = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'), 'El monto debe ser mayor a 0.')],
    )
    # Día en que se cobró: puede ser anterior a la carga (una transferencia de ayer)
    fecha = models.DateField()
    medio_pago = models.CharField(max_length=20, choices=MEDIOS)

    class Meta:
        db_table = 'pago'
        verbose_name = 'pago'
        verbose_name_plural = 'pagos'
        ordering = ['fecha', 'id']

    def __str__(self):
        return f'Pago {self.pk} - reserva {self.id_reserva_id} (${self.monto})'

    def clean(self):
        """
        1. R17: la fecha del pago no puede ser posterior a hoy.
        2. Una reserva cancelada no admite pagos.
        3. R9: el pago no puede superar el saldo pendiente.
        """
        errores = {}

        if self.fecha and self.fecha > date.today():
            errores['fecha'] = 'La fecha del pago no puede ser posterior a hoy.'

        reserva = None
        if self.id_reserva_id:
            reserva = Reserva.objects.filter(pk=self.id_reserva_id).first()

        if reserva and reserva.estado == CANCELADA:
            errores['id_reserva'] = 'La reserva está cancelada: no admite pagos.'
        elif reserva and self.monto:
            saldo = reserva.saldo()
            if self.monto > saldo:
                errores['monto'] = f'El pago supera el saldo pendiente (${saldo}).'

        if errores:
            raise ValidationError(errores)
