# Archivo: minimarket_ml_system/backend/apps/inventory/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.http import JsonResponse
from .views import (
    StockMovementViewSet, PurchaseOrderViewSet, 
    InventoryCountViewSet, InventoryReportsViewSet
)

def inventory_test(request):
    return JsonResponse({
        'message': 'Inventory API funcionando',
        'endpoints': {
            'stock_movements': '/api/inventory/stock-movements/',
            'purchase_orders': '/api/inventory/purchase-orders/',
            'inventory_counts': '/api/inventory/inventory-counts/',
            'reports': '/api/inventory/reports/',
            'low_stock_report': '/api/inventory/reports/low_stock/',
            'bulk_adjust': '/api/inventory/reports/bulk_adjust_stock/'
        }
    })

app_name = 'inventory'

router = DefaultRouter()
router.register(r'stock-movements', StockMovementViewSet)
router.register(r'purchase-orders', PurchaseOrderViewSet)
router.register(r'inventory-counts', InventoryCountViewSet)
router.register(r'reports', InventoryReportsViewSet, basename='reports')

urlpatterns = [
    path('', include(router.urls)),
    path('test/', inventory_test, name='inventory_test'),
]