"""
Vistas del componente Pasajeros. Todas heredan de APIView.

No hay DELETE: un pasajero con reservas no se puede borrar (PROTECT) y el MVP
no pide dar de baja pasajeros.
"""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Pasajero
from .serializers import PasajeroSerializer

ERROR_INTERNO = {'detalle': 'Error interno del servidor.'}


class PasajeroListView(APIView):
    """
    GET /api/v1/pasajeros con filtros opcionales: ?dni= (exacto, lo usa el alta
    de la reserva para reutilizar al pasajero que vuelve) y ?apellido= (contiene).
    POST da de alta un pasajero.
    """

    def get(self, request):
        try:
            pasajeros = Pasajero.objects.all()
            filtros = request.query_params
            if filtros.get('dni'):
                pasajeros = pasajeros.filter(dni=filtros['dni'])
            if filtros.get('apellido'):
                pasajeros = pasajeros.filter(apellido__icontains=filtros['apellido'])
            serializer = PasajeroSerializer(pasajeros, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception:
            return Response(ERROR_INTERNO, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        serializer = PasajeroSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception:
            return Response(ERROR_INTERNO, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PasajeroDetailView(APIView):
    """GET, PUT y PATCH de /api/v1/pasajeros/<id> (por ejemplo, corregir el teléfono)."""

    def get(self, request, pk):
        try:
            pasajero = Pasajero.objects.get(pk=pk)
        except Pasajero.DoesNotExist:
            return Response({'detalle': 'Pasajero no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(PasajeroSerializer(pasajero).data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        return self._actualizar(request, pk, parcial=False)

    def patch(self, request, pk):
        return self._actualizar(request, pk, parcial=True)

    def _actualizar(self, request, pk, parcial):
        try:
            pasajero = Pasajero.objects.get(pk=pk)
        except Pasajero.DoesNotExist:
            return Response({'detalle': 'Pasajero no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = PasajeroSerializer(pasajero, data=request.data, partial=parcial)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception:
            return Response(ERROR_INTERNO, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
