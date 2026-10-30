"""
Componente Administradores: las cuentas que inician sesión (HU-01).

El MVP tiene un único perfil, así que no hay roles. Las cuentas se cargan con
el script database/complejo_el_cuadrado.sql: no hay registro desde la app.
"""
from django.core.validators import MinLengthValidator
from django.db import models


class Administrador(models.Model):
    # PK del MR: id_administrador. En Python el atributo se sigue llamando "id",
    # así el JSON de la API usa la clave "id", pero en MySQL la columna se
    # llama id_administrador (db_column).
    id = models.AutoField(primary_key=True, db_column='id_administrador')
    nombre = models.CharField(max_length=50)
    apellido = models.CharField(max_length=50)
    email = models.EmailField(
        max_length=100,
        unique=True,
        help_text='Correo electrónico único: es el usuario del login.',
    )
    # Sin hash, igual que en la consigna de Programación II: la clave se
    # compara tal cual en el login.
    clave_acceso = models.CharField(
        max_length=100,
        validators=[MinLengthValidator(6, 'La clave debe tener al menos 6 caracteres.')],
    )

    class Meta:
        db_table = 'administrador'
        verbose_name = 'administrador'
        verbose_name_plural = 'administradores'
        ordering = ['id']

    def __str__(self):
        return f'{self.nombre} {self.apellido} ({self.email})'
