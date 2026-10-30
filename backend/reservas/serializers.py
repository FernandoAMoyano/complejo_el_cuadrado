from rest_framework import serializers

from complejo_el_cuadrado.validacion import ValidarConModeloMixin
from .models import Reserva


class ReservaSerializer(ValidarConModeloMixin, serializers.ModelSerializer):
    class Meta:
        model = Reserva
        fields = [
            'id', 'id_unidad', 'id_pasajero', 'fecha_ingreso', 'fecha_egreso',
            'cantidad_huespedes', 'importe_acordado', 'estado', 'fecha_registro',
            'fecha_limite_pago', 'motivo_cancelacion', 'fecha_hora_checkin',
            'fecha_hora_checkout',
        ]
        # Estos campos no los carga el administrador en el alta: los completa
        # el sistema según las reglas del MR (estado inicial, plazo, check-in...).
        read_only_fields = [
            'estado', 'fecha_registro', 'fecha_limite_pago', 'motivo_cancelacion',
            'fecha_hora_checkin', 'fecha_hora_checkout',
        ]


class AccionReservaSerializer(serializers.Serializer):
    """
    Cuerpo del PATCH /reservas/<id>. Serializer sin modelo, como el del login:
    - {"estado": "Cancelada" | "En curso" | "Finalizada"}: cancelar, check-in o check-out.
    - {"fecha_limite_pago": "2026-11-05T18:00"}: extender el plazo de la seña.
    La reserva no se modifica de otra forma: la modificación de reservas está
    fuera del MVP (Tabla 19).
    """
    estado = serializers.ChoiceField(choices=Reserva.ESTADOS, required=False)
    fecha_limite_pago = serializers.DateTimeField(required=False)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError('Enviá "estado" o "fecha_limite_pago".')
        return attrs


class DisponibilidadSerializer(serializers.Serializer):
    """Parámetros de GET /disponibilidad (HU-03)."""
    ingreso = serializers.DateField()
    egreso = serializers.DateField()
    huespedes = serializers.IntegerField(min_value=1, max_value=4)

    def validate(self, attrs):
        if attrs['egreso'] <= attrs['ingreso']:
            raise serializers.ValidationError(
                {'egreso': 'La fecha de egreso debe ser posterior a la de ingreso.'}
            )
        return attrs
