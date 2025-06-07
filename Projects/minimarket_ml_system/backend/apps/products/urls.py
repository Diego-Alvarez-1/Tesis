from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.http import JsonResponse

def products_test(request):
    return JsonResponse({'message': 'Products API funcionando'})

app_name = 'products'

router = DefaultRouter()
# Los viewsets se añadirán en la siguiente etapa

urlpatterns = [
    path('', include(router.urls)),
    path('test/', products_test, name='products_test'),
]