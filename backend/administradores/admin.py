from django.contrib import admin

from .models import Administrador


@admin.register(Administrador)
class AdministradorAdmin(admin.ModelAdmin):
    list_display = ['id', 'nombre', 'apellido', 'email']
    search_fields = ['nombre', 'apellido', 'email']
