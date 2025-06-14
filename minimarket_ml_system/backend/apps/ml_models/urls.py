# Archivo: minimarket_ml_system/backend/apps/ml_models/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.http import JsonResponse
from .views import (
    MLModelViewSet, PredictionRequestViewSet, 
    DemandPredictionViewSet, ReorderRecommendationViewSet
)

def ml_test(request):
    return JsonResponse({
        'message': 'ML Models API funcionando',
        'endpoints': {
            'models': '/api/ml/models/',
            'predictions': '/api/ml/predictions/',
            'demand_predictions': '/api/ml/demand-predictions/',
            'reorder_recommendations': '/api/ml/reorder-recommendations/',
            'train_model': '/api/ml/models/train_new_model/',
            'predict_demand': '/api/ml/predictions/predict_demand/',
            'batch_predict': '/api/ml/predictions/batch_predict/',
        }
    })

app_name = 'ml_models'

router = DefaultRouter()
router.register(r'models', MLModelViewSet)
router.register(r'predictions', PredictionRequestViewSet)
router.register(r'demand-predictions', DemandPredictionViewSet)
router.register(r'reorder-recommendations', ReorderRecommendationViewSet, basename='reorder')

urlpatterns = [
    path('', include(router.urls)),
    path('test/', ml_test, name='ml_test'),
]