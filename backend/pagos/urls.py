"""
Rutas locales del componente Pagos (sin barra final, con path()).
"""
from django.urls import path

from .views import PagoDetailView, PagoListView

urlpatterns = [
    path('pagos', PagoListView.as_view(), name='pagos'),
    path('pagos/<int:pk>', PagoDetailView.as_view(), name='pago-detalle'),
]
