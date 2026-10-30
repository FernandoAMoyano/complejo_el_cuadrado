from django.contrib import admin

from .models import Pago


@admin.register(Pago)
class PagoAdmin(admin.ModelAdmin):
    list_display = ['id', 'id_reserva', 'monto', 'fecha', 'medio_pago']
    list_filter = ['medio_pago']
