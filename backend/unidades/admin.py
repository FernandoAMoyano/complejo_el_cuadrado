from django.contrib import admin

from .models import Unidad


@admin.register(Unidad)
class UnidadAdmin(admin.ModelAdmin):
    list_display = ['id', 'nombre', 'capacidad', 'estado']
    list_filter = ['estado']
    search_fields = ['nombre']
