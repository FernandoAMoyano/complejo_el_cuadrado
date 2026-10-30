"""
Componente Unidades: los aparts del complejo y su estado (HU-02).

Tabla, columnas, tipos y largos según el Modelo Relacional (docs/MR.md).
"""
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

DISPONIBLE = 'Disponible'
OCUPADA = 'Ocupada'
EN_LIMPIEZA = 'En limpieza'
EN_MANTENIMIENTO = 'En mantenimiento'

# Cambios de estado que el administrador puede hacer a mano (MR, sección 3).
# Ocupada no figura como destino: una unidad solo se ocupa con el check-in
# (HU-08) y solo pasa a En limpieza con el check-out (HU-09).
CAMBIOS_MANUALES = {
    DISPONIBLE: [EN_MANTENIMIENTO],
    EN_LIMPIEZA: [DISPONIBLE, EN_MANTENIMIENTO],
    EN_MANTENIMIENTO: [DISPONIBLE],
    OCUPADA: [],
}


class Unidad(models.Model):
    ESTADOS = [
        (DISPONIBLE, DISPONIBLE),
        (OCUPADA, OCUPADA),
        (EN_LIMPIEZA, EN_LIMPIEZA),
        (EN_MANTENIMIENTO, EN_MANTENIMIENTO),
    ]

    # PK del MR: id_unidad. El atributo de Python sigue siendo "id" (ver administradores/models.py)
    id = models.AutoField(primary_key=True, db_column='id_unidad')
    nombre = models.CharField(
        max_length=30,
        unique=True,
        help_text='Identificación visible de la unidad, por ejemplo "Apart 1". No se puede repetir.',
        error_messages={'unique': 'Ya existe una unidad con ese nombre.'},
    )
    capacidad = models.IntegerField(
        validators=[
            MinValueValidator(1, 'La capacidad mínima es 1 huésped.'),
            MaxValueValidator(4, 'La capacidad máxima es 4 huéspedes.'),
        ]
    )
    # HU-02: toda unidad nueva queda Disponible
    estado = models.CharField(max_length=20, choices=ESTADOS, default=DISPONIBLE)
    descripcion = models.CharField(max_length=500, blank=True, null=True)

    class Meta:
        db_table = 'unidad'
        verbose_name = 'unidad'
        verbose_name_plural = 'unidades'
        ordering = ['id']

    def __str__(self):
        return self.nombre

    def clean(self):
        # R18. Al editar: no se puede bajar la capacidad por debajo de los huéspedes
        # de una reserva activa (quedaría una reserva imposible de cumplir).
        # Los estados se escriben acá porque reservas/models.py importa este
        # archivo y no al revés.
        if self.pk and self.capacidad:
            excedidas = self.reservas.filter(
                estado__in=['Pendiente de seña', 'Confirmada', 'En curso'],
                cantidad_huespedes__gt=self.capacidad,
            )
            if excedidas.exists():
                raise ValidationError({
                    'capacidad': 'Hay reservas activas con más huéspedes que esa capacidad.'
                })

    def validar_cambio_manual(self, nuevo_estado):
        """Devuelve el motivo si el cambio de estado no está permitido, o None si lo está."""
        if nuevo_estado == self.estado:
            return None
        if self.estado == OCUPADA:
            return 'Una unidad ocupada no se cambia a mano: pasa a En limpieza con el check-out.'
        if nuevo_estado not in CAMBIOS_MANUALES.get(self.estado, []):
            return f'Una unidad {self.estado} no puede pasar a {nuevo_estado} a mano.'
        return None
