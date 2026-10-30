"""
Vistas del componente Reservas. Todas heredan de APIView.

Antes de responder, cada vista llama a vencer_reservas_pendientes() (R7): así
el listado, el detalle y la disponibilidad nunca muestran una reserva vencida.
"""
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from unidades.models import EN_MANTENIMIENTO, Unidad
from unidades.serializers import UnidadSerializer
from .models import ACTIVAS, Reserva, vencer_reservas_pendientes
from .serializers import AccionReservaSerializer, DisponibilidadSerializer, ReservaSerializer

ERROR_INTERNO = {'detalle': 'Error interno del servidor.'}


# ========== DISPONIBILIDAD (HU-03) ==========
class DisponibilidadView(APIView):
    """
    GET /api/v1/disponibilidad?ingreso=2026-12-10&egreso=2026-12-12&huespedes=2

    R5: devuelve las unidades con capacidad suficiente, que no están en
    mantenimiento y sin reservas activas superpuestas. El estado actual
    Ocupada o En limpieza no impide reservar fechas futuras.
    """

    def get(self, request):
        datos = DisponibilidadSerializer(data=request.query_params)
        if not datos.is_valid():
            return Response(datos.errors, status=status.HTTP_400_BAD_REQUEST)
        ingreso = datos.validated_data['ingreso']
        egreso = datos.validated_data['egreso']
        huespedes = datos.validated_data['huespedes']
        try:
            vencer_reservas_pendientes()
            # Misma regla de superposición que Reserva.clean() (R2)
            superpuestas = Reserva.objects.filter(
                estado__in=ACTIVAS,
                fecha_ingreso__lt=egreso,
                fecha_egreso__gt=ingreso,
            )
            ocupadas = [reserva.id_unidad_id for reserva in superpuestas]
            unidades = (
                Unidad.objects.filter(capacidad__gte=huespedes)
                .exclude(estado=EN_MANTENIMIENTO)
                .exclude(id__in=ocupadas)
            )
            serializer = UnidadSerializer(unidades, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception:
            return Response(ERROR_INTERNO, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ========== RESERVAS ==========
class ReservaListView(APIView):
    """
    GET /api/v1/reservas con filtros opcionales (HU-05): ?estado=, ?id_unidad=,
    ?id_pasajero=, ?apellido= (contiene) y ?dni= (exacto) del titular.
    POST registra una reserva (HU-04): queda Pendiente de seña con su fecha límite.
    """

    def get(self, request):
        try:
            vencer_reservas_pendientes()
            reservas = Reserva.objects.all()
            filtros = request.query_params
            if filtros.get('estado'):
                reservas = reservas.filter(estado=filtros['estado'])
            if filtros.get('id_unidad'):
                reservas = reservas.filter(id_unidad=filtros['id_unidad'])
            if filtros.get('id_pasajero'):
                reservas = reservas.filter(id_pasajero=filtros['id_pasajero'])
            # id_pasajero__apellido: filtra por una columna de la tabla pasajero
            if filtros.get('apellido'):
                reservas = reservas.filter(id_pasajero__apellido__icontains=filtros['apellido'])
            if filtros.get('dni'):
                reservas = reservas.filter(id_pasajero__dni=filtros['dni'])
            serializer = ReservaSerializer(reservas, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception:
            return Response(ERROR_INTERNO, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def post(self, request):
        # La superposición se revalida en Reserva.clean() a través del serializer
        serializer = ReservaSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            reserva = serializer.save()
            # R6: la fecha límite se calcula con la fecha de registro que puso Django
            reserva.fecha_limite_pago = reserva.calcular_limite_pago()
            reserva.save()
            return Response(ReservaSerializer(reserva).data, status=status.HTTP_201_CREATED)
        except Exception:
            return Response(ERROR_INTERNO, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ReservaDetailView(APIView):
    """
    GET y PATCH de /api/v1/reservas/<id>

    El PATCH no edita los datos de la reserva (fuera del MVP): solo aplica una
    acción, validada por el modelo:
    - {"estado": "Cancelada"}   cancelar (HU-05)
    - {"estado": "En curso"}    check-in (HU-08)
    - {"estado": "Finalizada"}  check-out (HU-09)
    - {"fecha_limite_pago": "..."}  extender el plazo de la seña (HU-07)
    No hay DELETE: una reserva cancelada conserva su registro y sus pagos.
    """

    def get(self, request, pk):
        try:
            vencer_reservas_pendientes()
            reserva = Reserva.objects.get(pk=pk)
        except Reserva.DoesNotExist:
            return Response({'detalle': 'Reserva no encontrada.'}, status=status.HTTP_404_NOT_FOUND)
        except Exception:
            return Response(ERROR_INTERNO, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(ReservaSerializer(reserva).data, status=status.HTTP_200_OK)

    def patch(self, request, pk):
        try:
            vencer_reservas_pendientes()
            reserva = Reserva.objects.get(pk=pk)
        except Reserva.DoesNotExist:
            return Response({'detalle': 'Reserva no encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        accion = AccionReservaSerializer(data=request.data)
        if not accion.is_valid():
            return Response(accion.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            if 'fecha_limite_pago' in accion.validated_data:
                reserva.extender_plazo(accion.validated_data['fecha_limite_pago'])
            if 'estado' in accion.validated_data:
                reserva.cambiar_estado(accion.validated_data['estado'])
        except DjangoValidationError as error:
            # Mismo formato que los errores del serializer: {campo: [mensaje]}
            return Response(error.message_dict, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            return Response(ERROR_INTERNO, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(ReservaSerializer(reserva).data, status=status.HTTP_200_OK)
