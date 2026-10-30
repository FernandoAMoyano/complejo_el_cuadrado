from django.contrib import admin

from .models import Reserva


@admin.register(Reserva)
class ReservaAdmin(admin.ModelAdmin):
    list_display = ['id', 'id_unidad', 'id_pasajero', 'fecha_ingreso', 'fecha_egreso',
                    'estado', 'importe_acordado', 'fecha_limite_pago']
    list_filter = ['estado', 'id_unidad']
    search_fields = ['id_pasajero__apellido', 'id_pasajero__dni']
