from rest_framework import serializers

from complejo_el_cuadrado.validacion import ValidarConModeloMixin
from .models import Unidad


class UnidadSerializer(ValidarConModeloMixin, serializers.ModelSerializer):
    class Meta:
        model = Unidad
        fields = ['id', 'nombre', 'capacidad', 'estado', 'descripcion']
        # El estado no se carga con el resto de los datos: en el alta queda
        # Disponible y después cambia con las acciones que valida la vista.
        read_only_fields = ['estado']
