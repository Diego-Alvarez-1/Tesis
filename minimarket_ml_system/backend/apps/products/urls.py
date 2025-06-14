# Archivo: minimarket_ml_system/backend/apps/products/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.http import JsonResponse
from .views import CategoryViewSet, SupplierViewSet, ProductViewSet

def products_test(request):
    return JsonResponse({
        'message': 'Products API funcionando',
        'endpoints': {
            'categories': '/api/products/categories/',
            'suppliers': '/api/products/suppliers/',
            'products': '/api/products/products/',
            'low_stock': '/api/products/products/low_stock/',
            'by_category': '/api/products/products/by_category/',
            'dashboard_stats': '/api/products/products/dashboard_stats/'
        }
    })

app_name = 'products'

router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'suppliers', SupplierViewSet)
router.register(r'products', ProductViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('test/', products_test, name='products_test'),
]