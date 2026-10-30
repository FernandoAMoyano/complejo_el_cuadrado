from rest_framework import serializers

from .models import Administrador


class AdministradorSerializer(serializers.ModelSerializer):
    # La clave nunca se devuelve: solo viaja en el pedido de login
    class Meta:
        model = Administrador
        fields = ['id', 'nombre', 'apellido', 'email']


class LoginSerializer(serializers.Serializer):
    # Serializer sin modelo: solo valida que lleguen los dos datos del formulario
    email = serializers.EmailField()
    clave_acceso = serializers.CharField()
