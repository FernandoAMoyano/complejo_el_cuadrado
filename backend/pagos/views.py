"""
Vistas del componente Pagos (HU-06). Heredan de APIView.

Los pagos no se editan ni se borran: el MVP no tiene módulo de pagos avanzado
(apartado 4.5). Si se carga uno mal, se corrige desde el panel /admin/ de Django.
"""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from reservas.models import vencer_reservas_pendientes
from .models import Pago
from .serializers import PagoSerializer

ERROR_INTERNO = {'detalle': 'Error interno del servidor.'}


class PagoListView(APIView):
    """
    GET /api/v1/pagos con ?id_reserva= opcional (el detalle de la reserva lista
    cada pago con fecha, monto y medio). POST registra un pago: si la reserva
    estaba pendiente de seña, ese pago es la seña y la confirma (R10).
    """

    def get(self, request):
        try:
            pagos = Pago.objects.all()
            id_reserva = request.query_params.get('id_reserva')
            if id_reserva:
                pagos = pagos.filter(id_reserva=id_reserva)
            serializer = PagoSerializer(pagos, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception:
            return Response(ERROR_INTERNO, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        # Primero se vencen las pendientes: una seña que llega tarde no confirma
        # una reserva que ya venció (Pago.clean() la rechaza por cancelada).
        vencer_reservas_pendientes()
        serializer = PagoSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            pago = serializer.save()
            pago.id_reserva.confirmar_con_sena()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception:
            return Response(ERROR_INTERNO, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PagoDetailView(APIView):
    """GET de /api/v1/pagos/<id>"""

    def get(self, request, pk):
        try:
            pago = Pago.objects.get(pk=pk)
        except Pago.DoesNotExist:
            return Response({'detalle': 'Pago no encontrado.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(PagoSerializer(pago).data, status=status.HTTP_200_OK)
