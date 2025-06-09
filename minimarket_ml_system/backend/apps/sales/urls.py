from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.http import JsonResponse

def sales_test(request):
    return JsonResponse({'message': 'Sales API funcionando'})

app_name = 'sales'

router = DefaultRouter()

urlpatterns = [
    path('', include(router.urls)),
    path('test/', sales_test, name='sales_test'),
]