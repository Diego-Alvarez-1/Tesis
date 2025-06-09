from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.http import JsonResponse

def analytics_test(request):
    return JsonResponse({'message': 'Analytics API funcionando'})

app_name = 'analytics'

router = DefaultRouter()

urlpatterns = [
    path('', include(router.urls)),
    path('test/', analytics_test, name='analytics_test'),
]