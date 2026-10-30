"""
Rutas locales del componente Reservas (sin barra final, con path()).
"""
from django.urls import path

from .views import DisponibilidadView, ReservaDetailView, ReservaListView

urlpatterns = [
    path('disponibilidad', DisponibilidadView.as_view(), name='disponibilidad'),
    path('reservas', ReservaListView.as_view(), name='reservas'),
    path('reservas/<int:pk>', ReservaDetailView.as_view(), name='reserva-detalle'),
]
