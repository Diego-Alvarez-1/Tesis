from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.http import JsonResponse

def inventory_test(request):
    return JsonResponse({'message': 'Inventory API funcionando'})

app_name = 'inventory'

router = DefaultRouter()

urlpatterns = [
    path('', include(router.urls)),
    path('test/', inventory_test, name='inventory_test'),
]