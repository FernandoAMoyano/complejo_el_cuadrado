"""
Rutas generales del proyecto.

Cada aplicación define sus rutas locales en su propio urls.py y acá se
incluyen todas bajo el prefijo versionado /api/v1/.
"""
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('administradores.urls')),
    path('api/v1/', include('unidades.urls')),
    path('api/v1/', include('pasajeros.urls')),
    path('api/v1/', include('reservas.urls')),
    path('api/v1/', include('pagos.urls')),
]
