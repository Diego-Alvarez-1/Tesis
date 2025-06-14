# Archivo: minimarket_ml_system/backend/apps/ml_models/serializers.py

from rest_framework import serializers
from .models import MLModel, PredictionRequest, DemandPrediction, ModelPerformance
from apps.products.models import Product

class MLModelSerializer(serializers.ModelSerializer):
    """Serializer para modelos de ML"""
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    model_type_display = serializers.CharField(source='get_model_type_display', read_only=True)
    
    class Meta:
        model = MLModel
        fields = [
            'id', 'name', 'model_type', 'model_type_display', 'version', 
            'description', 'parameters', 'metrics', 'training_data_size',
            'training_date', 'training_duration', 'is_active', 'is_default',
            'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'training_date']

class PredictionRequestSerializer(serializers.ModelSerializer):
    """Serializer para solicitudes de predicción"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    model_name = serializers.CharField(source='model_used.name', read_only=True)
    processing_time_seconds = serializers.SerializerMethodField()
    
    class Meta:
        model = PredictionRequest
        fields = [
            'id', 'product', 'product_name', 'model_used', 'model_name',
            'user', 'user_name', 'prediction_days', 'input_data',
            'prediction_result', 'confidence_score', 'notes',
            'processing_time', 'processing_time_seconds', 'requested_at', 'completed_at'
        ]
        read_only_fields = ['id', 'requested_at', 'completed_at', 'processing_time']
    
    def get_processing_time_seconds(self, obj):
        """Retorna el tiempo de procesamiento en segundos"""
        if obj.processing_time:
            return obj.processing_time.total_seconds()
        return None

class DemandPredictionSerializer(serializers.ModelSerializer):
    """Serializer para predicciones de demanda"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_code = serializers.CharField(source='product.code', read_only=True)
    category_name = serializers.CharField(source='product.category.name', read_only=True)
    prediction_period_display = serializers.CharField(source='get_prediction_period_display', read_only=True)
    accuracy_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = DemandPrediction
        fields = [
            'id', 'product', 'product_name', 'product_code', 'category_name',
            'prediction_request', 'prediction_date', 'prediction_period',
            'prediction_period_display', 'predicted_quantity', 'lower_bound',
            'upper_bound', 'actual_quantity', 'error', 'error_percentage',
            'accuracy_percentage', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'error', 'error_percentage', 'created_at', 'updated_at']
    
    def get_accuracy_percentage(self, obj):
        """Calcula el porcentaje de precisión"""
        if obj.actual_quantity is not None and obj.predicted_quantity > 0:
            error_pct = abs(obj.predicted_quantity - obj.actual_quantity) / obj.actual_quantity * 100
            return max(0, 100 - error_pct)
        return None

class ModelPerformanceSerializer(serializers.ModelSerializer):
    """Serializer para rendimiento de modelos"""
    model_name = serializers.CharField(source='model.name', read_only=True)
    product_name = serializers.CharField(source='product.name', read_only=True)
    evaluation_period_display = serializers.CharField(source='get_evaluation_period_display', read_only=True)
    
    class Meta:
        model = ModelPerformance
        fields = [
            'id', 'model', 'model_name', 'product', 'product_name',
            'evaluation_date', 'evaluation_period', 'evaluation_period_display',
            'mae', 'rmse', 'mape', 'r2_score', 'predictions_count',
            'notes', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class ProductPredictionSummarySerializer(serializers.Serializer):
    """Serializer para resumen de predicciones por producto"""
    product_id = serializers.IntegerField()
    product_name = serializers.CharField()
    current_stock = serializers.IntegerField()
    total_predicted_demand = serializers.DecimalField(max_digits=10, decimal_places=2)
    avg_daily_demand = serializers.DecimalField(max_digits=10, decimal_places=2)
    max_daily_demand = serializers.DecimalField(max_digits=10, decimal_places=2)
    days_of_stock = serializers.DecimalField(max_digits=10, decimal_places=2)
    needs_reorder = serializers.BooleanField()
    priority = serializers.CharField()

class ReorderRecommendationSerializer(serializers.Serializer):
    """Serializer para recomendaciones de reorden"""
    product_id = serializers.IntegerField()
    product_name = serializers.CharField()
    current_stock = serializers.IntegerField()
    reorder_point = serializers.IntegerField()
    predicted_demand_total = serializers.DecimalField(max_digits=10, decimal_places=2)
    predicted_demand_avg_daily = serializers.DecimalField(max_digits=10, decimal_places=2)
    predicted_demand_max_daily = serializers.DecimalField(max_digits=10, decimal_places=2)
    days_of_stock_available = serializers.DecimalField(max_digits=10, decimal_places=1)
    needs_reorder = serializers.BooleanField()
    suggested_order_quantity = serializers.DecimalField(max_digits=10, decimal_places=2)
    priority = serializers.CharField()

class ModelTrainingRequestSerializer(serializers.Serializer):
    """Serializer para solicitudes de entrenamiento"""
    days_back = serializers.IntegerField(default=730, min_value=30, max_value=2000)
    test_size = serializers.DecimalField(default=0.2, max_digits=3, decimal_places=2, min_value=0.1, max_value=0.5)
    save_model = serializers.BooleanField(default=True)

class PredictionRequestCreateSerializer(serializers.Serializer):
    """Serializer para crear solicitudes de predicción"""
    product_id = serializers.IntegerField()
    days_ahead = serializers.IntegerField(default=30, min_value=1, max_value=365)
    start_date = serializers.DateField(required=False)
    
    def validate_product_id(self, value):
        """Valida que el producto existe"""
        try:
            Product.objects.get(id=value, is_active=True)
        except Product.DoesNotExist:
            raise serializers.ValidationError("Producto no encontrado o inactivo")
        return value

class BatchPredictionRequestSerializer(serializers.Serializer):
    """Serializer para predicciones en lote"""
    product_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        max_length=50
    )
    days_ahead = serializers.IntegerField(default=30, min_value=1, max_value=365)
    start_date = serializers.DateField(required=False)
    
    def validate_product_ids(self, value):
        """Valida que todos los productos existen"""
        existing_products = Product.objects.filter(
            id__in=value, 
            is_active=True
        ).values_list('id', flat=True)
        
        missing_products = set(value) - set(existing_products)
        if missing_products:
            raise serializers.ValidationError(
                f"Productos no encontrados o inactivos: {list(missing_products)}"
            )
        return value