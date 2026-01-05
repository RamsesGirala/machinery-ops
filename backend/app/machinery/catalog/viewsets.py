from __future__ import annotations

from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import MethodNotAllowed
from rest_framework.response import Response
from django.db.models import Q

from .repositories import (
    MachineBaseRepository,
    AccessoryRepository,
    TaxRepository,
    LogisticsLegRepository,
    ClientRepository,
    PreTaxChargeRepository
)
from .services import (
    MachineBaseService,
    AccessoryService,
    TaxService,
    LogisticsLegService,
    ClientService,
    PreTaxChargeService
)
from .serializers import (
    MachineBaseSerializer,
    AccessorySerializer,
    TaxSerializer,
    LogisticsLegSerializer,
    ClientSerializer,
    PreTaxChargeSerializer
)

class NoPatchMixin:
    def partial_update(self, request, *args, **kwargs):
        raise MethodNotAllowed("PATCH")


class BaseCatalogViewSet(
    NoPatchMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,  # ✅ NUEVO: GET por id
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """
    - GET / -> paginado (si hay pagination global)
    - GET /{id}/ -> obtener por id ✅
    - GET /all/ -> sin paginar
    - POST / -> crear
    - PUT /{id}/ -> actualizar (sin PATCH)
    - DELETE /{id}/ -> eliminar
    """

    @action(detail=False, methods=["get"], url_path="all")
    def all(self, request):
        qs = self.get_queryset()
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class MachineBaseViewSet(BaseCatalogViewSet):
    serializer_class = MachineBaseSerializer

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.service = MachineBaseService(repo=MachineBaseRepository())

    def get_queryset(self):
        qs = self.service.list_qs()
        q = (self.request.query_params.get("q") or self.request.query_params.get("nombre") or "").strip()
        if q:
            qs = qs.filter(nombre__icontains=q)
        return qs.order_by("nombre")

    def perform_create(self, serializer):
        obj = self.service.create(serializer.validated_data)
        serializer.instance = obj

    def perform_update(self, serializer):
        obj = self.service.update(self.get_object().pk, serializer.validated_data)
        serializer.instance = obj

    def perform_destroy(self, instance):
        self.service.delete(instance.pk)

class AccessoryViewSet(BaseCatalogViewSet):
    serializer_class = AccessorySerializer

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.service = AccessoryService(repo=AccessoryRepository())

    def get_queryset(self):
        qs = self.service.list_qs()
        q = (self.request.query_params.get("q") or self.request.query_params.get("nombre") or "").strip()
        if q:
            qs = qs.filter(nombre__icontains=q)
        return qs.order_by("nombre")

    def perform_create(self, serializer):
        obj = self.service.create(serializer.validated_data)
        serializer.instance = obj

    def perform_update(self, serializer):
        obj = self.service.update(self.get_object().pk, serializer.validated_data)
        serializer.instance = obj

    def perform_destroy(self, instance):
        self.service.delete(instance.pk)

class TaxViewSet(BaseCatalogViewSet):
    serializer_class = TaxSerializer

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.service = TaxService(repo=TaxRepository())

    def get_queryset(self):
        qs = self.service.list_qs()
        q = (self.request.query_params.get("q") or self.request.query_params.get("nombre") or "").strip()
        if q:
            qs = qs.filter(nombre__icontains=q)
        return qs.order_by("nombre")

    def perform_create(self, serializer):
        obj = self.service.create(serializer.validated_data)
        serializer.instance = obj

    def perform_update(self, serializer):
        obj = self.service.update(self.get_object().pk, serializer.validated_data)
        serializer.instance = obj

    def perform_destroy(self, instance):
        self.service.delete(instance.pk)

class LogisticsLegViewSet(BaseCatalogViewSet):
    serializer_class = LogisticsLegSerializer

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.service = LogisticsLegService(repo=LogisticsLegRepository())

    def get_queryset(self):
        qs = self.service.list_qs()
        q = (self.request.query_params.get("q") or self.request.query_params.get("nombre") or "").strip()
        if q:
            qs = qs.filter(Q(desde__icontains=q) | Q(hasta__icontains=q))
        return qs.order_by("etapa", "desde", "hasta", "tipo")

    def perform_create(self, serializer):
        obj = self.service.create(serializer.validated_data)
        serializer.instance = obj

    def perform_update(self, serializer):
        obj = self.service.update(self.get_object().pk, serializer.validated_data)
        serializer.instance = obj

    def perform_destroy(self, instance):
        self.service.delete(instance.pk)

class ClientViewSet(BaseCatalogViewSet):
    serializer_class = ClientSerializer

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.service = ClientService(repo=ClientRepository())

    def get_queryset(self):
        qs = self.service.list_qs()
        q = (self.request.query_params.get("q") or self.request.query_params.get("nombre") or "").strip()
        if q:
            qs = qs.filter(nombre__icontains=q)
        return qs.order_by("nombre")

    def perform_create(self, serializer):
        obj = self.service.create(serializer.validated_data)
        serializer.instance = obj

    def perform_update(self, serializer):
        obj = self.service.update(self.get_object().pk, serializer.validated_data)
        serializer.instance = obj

    def perform_destroy(self, instance):
        self.service.delete(instance.pk)

class PreTaxChargeViewSet(BaseCatalogViewSet):
    serializer_class = PreTaxChargeSerializer

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.service = PreTaxChargeService(repo=PreTaxChargeRepository())

    def get_queryset(self):
        qs = self.service.list_qs()
        q = (self.request.query_params.get("q") or self.request.query_params.get("nombre") or "").strip()
        if q:
            qs = qs.filter(nombre__icontains=q)
        return qs.order_by("nombre")

    def perform_create(self, serializer):
        obj = self.service.create(serializer.validated_data)
        serializer.instance = obj

    def perform_update(self, serializer):
        obj = self.service.update(self.get_object().pk, serializer.validated_data)
        serializer.instance = obj

    def perform_destroy(self, instance):
        self.service.delete(instance.pk)
