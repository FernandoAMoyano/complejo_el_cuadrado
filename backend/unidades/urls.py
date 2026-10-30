"""
Rutas locales del componente Unidades (sin barra final, con path()).
"""
from django.urls import path

from .views import UnidadDetailView, UnidadListView

urlpatterns = [
    path('unidades', UnidadListView.as_view(), name='unidades'),
    path('unidades/<int:pk>', UnidadDetailView.as_view(), name='unidad-detalle'),
]
