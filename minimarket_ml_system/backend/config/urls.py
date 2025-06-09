from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

def api_root(request):
    return JsonResponse({
        'message': 'Sistema de Gestión Logística con ML - API Principal',
        'version': '1.0.0',
        'status': 'funcionando',
        'endpoints': {
            'admin': '/admin/',
            'products': '/api/products/',
            'inventory': '/api/inventory/',
            'sales': '/api/sales/',
            'ml_models': '/api/ml/',
            'analytics': '/api/analytics/',
        }
    })

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # API Root
    path('api/', api_root, name='api_root'),
    
    # App URLs
    path('api/products/', include('apps.products.urls')),
    path('api/inventory/', include('apps.inventory.urls')),
    path('api/sales/', include('apps.sales.urls')),
    path('api/ml/', include('apps.ml_models.urls')),
    path('api/analytics/', include('apps.analytics.urls')),
    
    # API Documentation (Django REST Framework)
    path('api-auth/', include('rest_framework.urls')),
]

# Serve static and media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)