"""
Puente entre las validaciones del modelo y los serializers de DRF.

Las reglas de negocio que cruzan varios campos (por ejemplo, que el egreso
sea posterior al ingreso) se escriben en el método clean() de cada modelo,
es decir, en la capa de modelos. Pero DRF no llama a clean() por su cuenta:
este mixin lo ejecuta dentro de la validación del serializer y convierte los
errores de Django en errores de DRF, que la vista devuelve con status 400.
"""
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers


class ValidarConModeloMixin:

    def validate(self, attrs):
        attrs = super().validate(attrs)

        # Instancia temporal con los datos nuevos: en un alta se crea vacía y,
        # en una edición, se copian los valores actuales y encima los recibidos.
        modelo = self.Meta.model
        if self.instance is not None:
            instancia = modelo.objects.get(pk=self.instance.pk)
        else:
            instancia = modelo()
        for campo, valor in attrs.items():
            setattr(instancia, campo, valor)

        try:
            instancia.clean()
        except DjangoValidationError as error:
            raise serializers.ValidationError(error.message_dict)

        return attrs
