"""
Vistas del componente Administradores. Heredan de APIView: cada método HTTP
se escribe a mano para controlar la lógica y el código de estado.
"""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Administrador
from .serializers import AdministradorSerializer, LoginSerializer

ERROR_INTERNO = {'detalle': 'Error interno del servidor.'}


class LoginView(APIView):
    """
    POST /api/v1/login con {"email": "...", "clave_acceso": "..."}  (HU-01)

    Responde 200 con los datos del administrador si coinciden, o 401 con un
    mensaje que no dice cuál de los dos datos está mal. Va por POST para que
    la clave viaje en el cuerpo del pedido y no en la URL.
    """

    def post(self, request):
        datos = LoginSerializer(data=request.data)
        if not datos.is_valid():
            return Response(datos.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            administrador = Administrador.objects.get(
                email__iexact=datos.validated_data['email'],
                clave_acceso=datos.validated_data['clave_acceso'],
            )
        except Administrador.DoesNotExist:
            return Response(
                {'detalle': 'Correo electrónico o contraseña incorrectos.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        except Exception:
            return Response(ERROR_INTERNO, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(AdministradorSerializer(administrador).data, status=status.HTTP_200_OK)
