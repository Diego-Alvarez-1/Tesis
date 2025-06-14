# Archivo: minimarket_ml_system/backend/apps/ml_models/views.py

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import datetime, timedelta
import json

from .models import MLModel, PredictionRequest, DemandPrediction, ModelPerformance
from .serializers import (
    MLModelSerializer, PredictionRequestSerializer, 
    DemandPredictionSerializer, ModelPerformanceSerializer
)
from .predictor import DemandPredictor
from .trainer import MLTrainer
from .data_processor import DataProcessor
from apps.products.models import Product

class MLModelViewSet(viewsets.ModelViewSet):
    """ViewSet para modelos de Machine Learning"""
    queryset = MLModel.objects.all()
    serializer_class = MLModelSerializer
    
    @action(detail=False, methods=['post'])
    def train_new_model(self, request):
        """Entrena un nuevo modelo"""
        try:
            # Parámetros de entrenamiento
            days_back = request.data.get('days_back', 730)
            test_size = request.data.get('test_size', 0.2)
            
            # Procesar datos
            data_processor = DataProcessor()
            df = data_processor.process_complete_dataset(days_back=days_back)
            
            if df.empty:
                return Response(
                    {'error': 'No hay suficientes datos para entrenar'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Preparar características
            X, y = data_processor.prepare_features_target(df)
            
            # Entrenar modelos
            trainer = MLTrainer(data_processor)
            best_model, best_model_name, results = trainer.train_all_models(X, y, test_size=test_size)
            
            # Guardar modelo
            model_path = trainer.save_model()
            
            # Crear registro en BD
            ml_model = MLModel.objects.create(
                name=f"{best_model_name}_demand_prediction",
                model_type=best_model_name.upper(),
                version="1.0",
                description=f"Modelo entrenado con {len(X)} muestras",
                model_file=model_path,
                parameters=json.dumps({
                    'test_size': test_size,
                    'features_count': len(trainer.feature_names),
                    'training_samples': len(X)
                }),
                metrics=json.dumps(trainer.metrics[best_model_name]['test_metrics']),
                training_data_size=len(X),
                is_active=True,
                is_default=True,
                created_by=request.user
            )
            
            # Preparar respuesta
            training_summary = trainer.create_model_summary()
            
            return Response({
                'success': True,
                'model_id': ml_model.id,
                'model_name': best_model_name,
                'training_summary': training_summary,
                'results': [
                    {
                        'model': r['model_name'],
                        'metrics': r['test_metrics']
                    }
                    for r in results
                ]
            })
            
        except Exception as e:
            return Response(
                {'error': f'Error entrenando modelo: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def set_as_default(self, request, pk=None):
        """Establece un modelo como predeterminado"""
        model = self.get_object()
        
        # Desactivar otros modelos como default
        MLModel.objects.filter(is_default=True).update(is_default=False)
        
        # Activar este modelo
        model.is_default = True
        model.is_active = True
        model.save()
        
        return Response({
            'success': True,
            'message': f'Modelo {model.name} establecido como predeterminado'
        })

class PredictionRequestViewSet(viewsets.ModelViewSet):
    """ViewSet para solicitudes de predicción"""
    queryset = PredictionRequest.objects.all()
    serializer_class = PredictionRequestSerializer
    
    @action(detail=False, methods=['post'])
    def predict_demand(self, request):
        """Genera predicción de demanda para un producto"""
        try:
            # Validar parámetros
            product_id = request.data.get('product_id')
            days_ahead = request.data.get('days_ahead', 30)
            start_date = request.data.get('start_date')
            
            if not product_id:
                return Response(
                    {'error': 'product_id es requerido'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Verificar que el producto existe
            product = get_object_or_404(Product, id=product_id)
            
            # Inicializar predictor
            predictor = DemandPredictor()
            if not predictor.load_model():
                return Response(
                    {'error': 'No se pudo cargar el modelo de predicción'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Procesar fecha de inicio
            if start_date:
                try:
                    start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                except ValueError:
                    return Response(
                        {'error': 'Formato de fecha inválido. Use YYYY-MM-DD'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                start_date = (datetime.now() + timedelta(days=1)).date()
            
            # Crear solicitud de predicción
            prediction_request = PredictionRequest.objects.create(
                product=product,
                user=request.user,
                prediction_days=days_ahead,
                input_data={
                    'start_date': start_date.isoformat(),
                    'days_ahead': days_ahead
                },
                requested_at=timezone.now()
            )
            
            # Generar predicción
            prediction_df = predictor.predict_demand(
                product_id=product_id,
                start_date=start_date,
                days_ahead=days_ahead
            )
            
            # Guardar resultados
            prediction_request.prediction_result = {
                'total_predicted': float(prediction_df['predicted_quantity'].sum()),
                'avg_daily': float(prediction_df['predicted_quantity'].mean()),
                'max_daily': float(prediction_df['predicted_quantity'].max())
            }
            prediction_request.completed_at = timezone.now()
            prediction_request.save()
            
            # Guardar predicciones detalladas
            predictions_to_create = []
            for _, row in prediction_df.iterrows():
                predictions_to_create.append(
                    DemandPrediction(
                        product=product,
                        prediction_request=prediction_request,
                        prediction_date=row['date'].date(),
                        prediction_period='DAILY',
                        predicted_quantity=row['predicted_quantity'],
                        lower_bound=row.get('lower_bound', 0),
                        upper_bound=row.get('upper_bound', row['predicted_quantity'] * 1.2)
                    )
                )
            
            DemandPrediction.objects.bulk_create(predictions_to_create, batch_size=100)
            
            # Preparar respuesta
            predictions_data = []
            for _, row in prediction_df.iterrows():
                predictions_data.append({
                    'date': row['date'].strftime('%Y-%m-%d'),
                    'predicted_quantity': round(row['predicted_quantity'], 2),
                    'lower_bound': round(row.get('lower_bound', 0), 2),
                    'upper_bound': round(row.get('upper_bound', row['predicted_quantity'] * 1.2), 2),
                    'is_weekend': bool(row.get('is_weekend', False)),
                    'is_holiday': bool(row.get('is_holiday', False))
                })
            
            return Response({
                'success': True,
                'prediction_request_id': prediction_request.id,
                'product': {
                    'id': product.id,
                    'name': product.name,
                    'current_stock': product.current_stock
                },
                'summary': prediction_request.prediction_result,
                'predictions': predictions_data
            })
            
        except Exception as e:
            return Response(
                {'error': f'Error generando predicción: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def batch_predict(self, request):
        """Genera predicciones para múltiples productos"""
        try:
            product_ids = request.data.get('product_ids', [])
            days_ahead = request.data.get('days_ahead', 30)
            start_date = request.data.get('start_date')
            
            if not product_ids:
                return Response(
                    {'error': 'product_ids es requerido'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Inicializar predictor
            predictor = DemandPredictor()
            if not predictor.load_model():
                return Response(
                    {'error': 'No se pudo cargar el modelo'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Generar predicciones
            results = predictor.predict_multiple_products(
                product_ids=product_ids,
                start_date=start_date,
                days_ahead=days_ahead
            )
            
            # Preparar respuesta
            response_data = []
            for product_id, prediction_df in results.items():
                if prediction_df is not None:
                    product = Product.objects.get(id=product_id)
                    response_data.append({
                        'product_id': product_id,
                        'product_name': product.name,
                        'total_predicted': float(prediction_df['predicted_quantity'].sum()),
                        'avg_daily': float(prediction_df['predicted_quantity'].mean()),
                        'success': True
                    })
                else:
                    response_data.append({
                        'product_id': product_id,
                        'success': False,
                        'error': 'Error generando predicción'
                    })
            
            return Response({
                'success': True,
                'results': response_data
            })
            
        except Exception as e:
            return Response(
                {'error': f'Error en predicción batch: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class DemandPredictionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para consultar predicciones de demanda"""
    queryset = DemandPrediction.objects.all()
    serializer_class = DemandPredictionSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtros opcionales
        product_id = self.request.query_params.get('product_id')
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if product_id:
            queryset = queryset.filter(product_id=product_id)
        
        if start_date:
            queryset = queryset.filter(prediction_date__gte=start_date)
        
        if end_date:
            queryset = queryset.filter(prediction_date__lte=end_date)
        
        return queryset.order_by('product', 'prediction_date')
    
    @action(detail=False, methods=['get'])
    def by_product(self, request):
        """Obtiene predicciones agrupadas por producto"""
        product_id = request.query_params.get('product_id')
        days = request.query_params.get('days', 30)
        
        if not product_id:
            return Response(
                {'error': 'product_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Obtener predicciones recientes
        start_date = datetime.now().date()
        end_date = start_date + timedelta(days=int(days))
        
        predictions = DemandPrediction.objects.filter(
            product_id=product_id,
            prediction_date__gte=start_date,
            prediction_date__lte=end_date
        ).order_by('prediction_date')
        
        if not predictions.exists():
            return Response({
                'message': 'No hay predicciones disponibles para este producto',
                'product_id': product_id
            })
        
        serializer = self.get_serializer(predictions, many=True)
        
        # Calcular resumen
        total_predicted = sum(p.predicted_quantity for p in predictions)
        avg_daily = total_predicted / len(predictions) if predictions else 0
        
        return Response({
            'product_id': product_id,
            'summary': {
                'total_predicted': round(total_predicted, 2),
                'avg_daily': round(avg_daily, 2),
                'predictions_count': len(predictions)
            },
            'predictions': serializer.data
        })

class ReorderRecommendationViewSet(viewsets.ViewSet):
    """ViewSet para recomendaciones de reorden"""
    
    def list(self, request):
        """Lista recomendaciones de reorden para todos los productos"""
        try:
            days_ahead = int(request.query_params.get('days_ahead', 30))
            priority_filter = request.query_params.get('priority')
            
            # Inicializar predictor
            predictor = DemandPredictor()
            if not predictor.load_model():
                return Response(
                    {'error': 'No se pudo cargar el modelo'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Obtener productos activos
            active_products = Product.objects.filter(is_active=True).values_list('id', flat=True)
            
            # Generar recomendaciones
            recommendations = predictor.batch_reorder_recommendations(
                product_ids=list(active_products),
                days_ahead=days_ahead
            )
            
            # Filtrar por prioridad si se especifica
            if priority_filter:
                recommendations = [r for r in recommendations if r['priority'] == priority_filter.upper()]
            
            return Response({
                'success': True,
                'total_recommendations': len(recommendations),
                'recommendations': recommendations
            })
            
        except Exception as e:
            return Response(
                {'error': f'Error generando recomendaciones: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def retrieve(self, request, pk=None):
        """Obtiene recomendación específica para un producto"""
        try:
            product_id = int(pk)
            days_ahead = int(request.query_params.get('days_ahead', 30))
            
            # Verificar que el producto existe
            product = get_object_or_404(Product, id=product_id)
            
            # Inicializar predictor
            predictor = DemandPredictor()
            if not predictor.load_model():
                return Response(
                    {'error': 'No se pudo cargar el modelo'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Generar recomendación
            recommendation = predictor.generate_reorder_recommendations(
                product_id=product_id,
                days_ahead=days_ahead
            )
            
            return Response({
                'success': True,
                'recommendation': recommendation
            })
            
        except Exception as e:
            return Response(
                {'error': f'Error generando recomendación: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )