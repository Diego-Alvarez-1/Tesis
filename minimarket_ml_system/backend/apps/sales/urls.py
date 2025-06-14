# Archivo: minimarket_ml_system/backend/apps/sales/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.http import JsonResponse
from .views import CustomerViewSet, SaleViewSet, DailySummaryViewSet

def sales_test(request):
    return JsonResponse({
        'message': 'Sales API funcionando',
        'endpoints': {
            'customers': '/api/sales/customers/',
            'sales': '/api/sales/sales/',
            'daily_summaries': '/api/sales/daily-summaries/',
            'dashboard_stats': '/api/sales/sales/dashboard_stats/',
            'sales_by_period': '/api/sales/sales/sales_by_period/',
            'top_customers': '/api/sales/customers/top_customers/'
        }
    })

app_name = 'sales'

router = DefaultRouter()
router.register(r'customers', CustomerViewSet)
router.register(r'sales', SaleViewSet)
router.register(r'daily-summaries', DailySummaryViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('test/', sales_test, name='sales_test'),
]