"""Punto de entrada WSGI (servidores web sincrónicos)."""
import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'complejo_el_cuadrado.settings')

application = get_wsgi_application()
