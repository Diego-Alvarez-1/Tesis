from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.http import JsonResponse

def ml_test(request):
    return JsonResponse({'message': 'ML Models API funcionando'})

app_name = 'ml_models'

router = DefaultRouter()

urlpatterns = [
    path('', include(router.urls)),
    path('test/', ml_test, name='ml_test'),
]