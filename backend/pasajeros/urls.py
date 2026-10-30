"""
Rutas locales del componente Pasajeros (sin barra final, con path()).
"""
from django.urls import path

from .views import PasajeroDetailView, PasajeroListView

urlpatterns = [
    path('pasajeros', PasajeroListView.as_view(), name='pasajeros'),
    path('pasajeros/<int:pk>', PasajeroDetailView.as_view(), name='pasajero-detalle'),
]
