# Archivo: minimarket_ml_system/backend/apps/analytics/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.http import JsonResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response
from apps.analytics.data_analysis import run_analysis

def analytics_test(request):
    return JsonResponse({
        'message': 'Analytics API funcionando',
        'endpoints': {
            'run_analysis': '/api/analytics/run_analysis/',
            'dashboard_overview': '/api/analytics/dashboard_overview/'
        }
    })

@api_view(['POST'])
def run_data_analysis(request):
    """Ejecuta análisis exploratorio de datos"""
    try:
        results = run_analysis()
        return Response({
            'success': True,
            'message': 'Análisis completado exitosamente',
            'results': results
        })
    except Exception as e:
        return Response({
            'success': False,
            'error': str(e)
        }, status=500)

@api_view(['GET'])
def dashboard_overview(request):
    """Vista general para dashboard"""
    from apps.products.models import Product
    from apps.sales.models import Sale, SaleItem
    from datetime import datetime, timedelta
    from django.db.models import Sum, Count, Avg
    
    today = datetime.now().date()
    last_30_days = today - timedelta(days=30)
    
    # Estadísticas generales
    total_products = Product.objects.filter(is_active=True).count()
    low_stock_count = len([p for p in Product.objects.filter(is_active=True) if p.needs_reorder])
    
    # Ventas del mes
    month_sales = Sale.objects.filter(
        sale_date__date__gte=last_30_days,
        status='COMPLETED'
    ).aggregate(
        total=Sum('total'),
        count=Count('id')
    )
    
    # Top productos vendidos
    top_products = SaleItem.objects.filter(
        sale__sale_date__date__gte=last_30_days,
        sale__status='COMPLETED'
    ).values(
        'product__name'
    ).annotate(
        quantity_sold=Sum('quantity'),
        revenue=Sum('total_price')
    ).order_by('-quantity_sold')[:5]
    
    return Response({
        'period': f'Últimos 30 días ({last_30_days} - {today})',
        'summary': {
            'total_products': total_products,
            'low_stock_products': low_stock_count,
            'month_sales_total': float(month_sales['total'] or 0),
            'month_sales_count': month_sales['count'] or 0
        },
        'top_products': list(top_products)
    })

app_name = 'analytics'

router = DefaultRouter()

urlpatterns = [
    path('', include(router.urls)),
    path('test/', analytics_test, name='analytics_test'),
    path('run_analysis/', run_data_analysis, name='run_analysis'),
    path('dashboard_overview/', dashboard_overview, name='dashboard_overview'),
]