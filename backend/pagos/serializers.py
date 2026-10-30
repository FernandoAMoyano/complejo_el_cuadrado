from rest_framework import serializers

from complejo_el_cuadrado.validacion import ValidarConModeloMixin
from .models import Pago


class PagoSerializer(ValidarConModeloMixin, serializers.ModelSerializer):
    class Meta:
        model = Pago
        fields = ['id', 'id_reserva', 'monto', 'fecha', 'medio_pago']
