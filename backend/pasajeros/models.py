"""
Componente Pasajeros: el titular de cada reserva (HU-04).

En el MVP solo se registran los datos del titular (apartado 4.5 del
documento). El DNI es único: un pasajero que vuelve se reutiliza.
"""
from django.core.validators import RegexValidator
from django.db import models


class Pasajero(models.Model):
    id = models.AutoField(primary_key=True, db_column='id_pasajero')
    nombre = models.CharField(max_length=50)
    apellido = models.CharField(max_length=50)
    dni = models.CharField(
        max_length=8,
        unique=True,
        validators=[RegexValidator(r'^[0-9]{7,8}$', 'El DNI debe tener 7 u 8 números, sin puntos.')],
        error_messages={'unique': 'Ya existe un pasajero con ese DNI.'},
    )
    # HU-10: con este teléfono se arma el enlace de WhatsApp
    telefono = models.CharField(
        max_length=20,
        validators=[
            RegexValidator(
                r'^\+?[0-9\- ]{7,19}$',
                'El teléfono solo puede tener números, guiones, espacios y un + inicial.',
            )
        ],
    )
    email = models.EmailField(max_length=100, blank=True, null=True)

    class Meta:
        db_table = 'pasajero'
        verbose_name = 'pasajero'
        verbose_name_plural = 'pasajeros'
        ordering = ['apellido', 'nombre']

    def __str__(self):
        return f'{self.apellido}, {self.nombre} (DNI {self.dni})'
