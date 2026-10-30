"""
Vistas del componente Unidades (HU-02). Todas heredan de APIView.

No hay DELETE: la HU-02 pide alta, modificación y consulta. Una unidad fuera
de servicio se pasa a En mantenimiento.
"""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Unidad
from .serializers import UnidadSerializer

ERROR_INTERNO = {'detalle': 'Error interno del servidor.'}


class UnidadListView(APIView):
    """GET /api/v1/unidades con ?estado= opcional. POST da de alta una unidad (queda Disponible)."""

    def get(self, request):
        try:
            unidades = Unidad.objects.all()
            estado = request.query_params.get('estado')
            if estado:
                unidades = unidades.filter(estado=estado)
            serializer = UnidadSerializer(unidades, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception:
            return Response(ERROR_INTERNO, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        serializer = UnidadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception:
            return Response(ERROR_INTERNO, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UnidadDetailView(APIView):
    """
    GET, PUT y PATCH de /api/v1/unidades/<id>

    El PATCH con {"estado": "..."} es la acción rápida del listado: pasar de
    En limpieza a Disponible, o a En mantenimiento (HU-02).
    """

    def get(self, request, pk):
        try:
            unidad = Unidad.objects.get(pk=pk)
        except Unidad.DoesNotExist:
            return Response({'detalle': 'Unidad no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(UnidadSerializer(unidad).data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        return self._actualizar(request, pk, parcial=False)

    def patch(self, request, pk):
        return self._actualizar(request, pk, parcial=True)

    # PUT reemplaza todos los campos; PATCH (parcial) solo los que llegan.
    # El estado se valida aparte, con los cambios permitidos del MR.
    def _actualizar(self, request, pk, parcial):
        try:
            unidad = Unidad.objects.get(pk=pk)
        except Unidad.DoesNotExist:
            return Response({'detalle': 'Unidad no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        nuevo_estado = request.data.get('estado')
        if nuevo_estado is not None:
            if nuevo_estado not in dict(Unidad.ESTADOS):
                return Response(
                    {'estado': [f'"{nuevo_estado}" no es un estado válido.']},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            motivo = unidad.validar_cambio_manual(nuevo_estado)
            if motivo:
                return Response({'estado': [motivo]}, status=status.HTTP_400_BAD_REQUEST)

        serializer = UnidadSerializer(unidad, data=request.data, partial=parcial)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            unidad = serializer.save()
            if nuevo_estado is not None:
                unidad.estado = nuevo_estado
                unidad.save()
            return Response(UnidadSerializer(unidad).data, status=status.HTTP_200_OK)
        except Exception:
            return Response(ERROR_INTERNO, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
