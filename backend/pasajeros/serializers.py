from rest_framework import serializers

from complejo_el_cuadrado.validacion import ValidarConModeloMixin
from .models import Pasajero


class PasajeroSerializer(ValidarConModeloMixin, serializers.ModelSerializer):
    class Meta:
        model = Pasajero
        fields = ['id', 'nombre', 'apellido', 'dni', 'telefono', 'email']
