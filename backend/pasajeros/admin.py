from django.contrib import admin

from .models import Pasajero


@admin.register(Pasajero)
class PasajeroAdmin(admin.ModelAdmin):
    list_display = ['id', 'apellido', 'nombre', 'dni', 'telefono', 'email']
    search_fields = ['apellido', 'nombre', 'dni']
