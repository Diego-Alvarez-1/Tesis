from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.products.models import Product
import json

class MLModel(models.Model):
    """Modelo para almacenar modelos de Machine Learning entrenados"""
    MODEL_TYPES = [
        ('LINEAR_REGRESSION', 'Regresión Lineal'),
        ('RANDOM_FOREST', 'Random Forest'),
        ('DECISION_TREE', 'Árbol de Decisión'),
        ('PROPHET', 'Prophet (Series Temporales)'),
        ('ARIMA', 'ARIMA'),
        ('XGB', 'XGBoost'),
    ]
    
    # Información básica
    name = models.CharField(max_length=200, verbose_name="Nombre del modelo")
    model_type = models.CharField(max_length=50, choices=MODEL_TYPES, verbose_name="Tipo de modelo")
    version = models.CharField(max_length=50, verbose_name="Versión")
    description = models.TextField(blank=True, verbose_name="Descripción")
    
    # Archivo del modelo
    model_file = models.FileField(upload_to='ml_models/', verbose_name="Archivo del modelo")
    
    # Parámetros y métricas
    parameters = models.JSONField(default=dict, verbose_name="Parámetros del modelo")
    metrics = models.JSONField(default=dict, verbose_name="Métricas de evaluación")
    
    # Información de entrenamiento
    training_data_size = models.IntegerField(verbose_name="Tamaño de datos de entrenamiento")
    training_date = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de entrenamiento")
    training_duration = models.DurationField(null=True, blank=True, verbose_name="Duración del entrenamiento")
    
    # Estado
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    is_default = models.BooleanField(default=False, verbose_name="Modelo por defecto")
    
    # Usuario
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name="Creado por")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Fecha de actualización")
    
    class Meta:
        verbose_name = "Modelo ML"
        verbose_name_plural = "Modelos ML"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} - {self.get_model_type_display()} v{self.version}"
    
    def save(self, *args, **kwargs):
        # Si se marca como default, desmarcar otros
        if self.is_default:
            MLModel.objects.filter(is_default=True).update(is_default=False)
        super().save(*args, **kwargs)

class PredictionRequest(models.Model):
    """Modelo para solicitudes de predicción"""
    # Relaciones
    product = models.ForeignKey(Product, on_delete=models.CASCADE, verbose_name="Producto")
    model_used = models.ForeignKey(MLModel, on_delete=models.SET_NULL, null=True, verbose_name="Modelo usado")
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name="Usuario")
    
    # Parámetros de predicción
    prediction_days = models.IntegerField(default=30, verbose_name="Días a predecir")
    input_data = models.JSONField(default=dict, verbose_name="Datos de entrada")
    
    # Resultados
    prediction_result = models.JSONField(default=dict, verbose_name="Resultado de predicción")
    confidence_score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, 
                                         validators=[MinValueValidator(0), MaxValueValidator(100)],
                                         verbose_name="Score de confianza")
    
    # Información adicional
    notes = models.TextField(blank=True, verbose_name="Notas")
    processing_time = models.DurationField(null=True, blank=True, verbose_name="Tiempo de procesamiento")
    
    # Timestamps
    requested_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de solicitud")
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name="Fecha de completado")
    
    class Meta:
        verbose_name = "Solicitud de predicción"
        verbose_name_plural = "Solicitudes de predicción"
        ordering = ['-requested_at']
    
    def __str__(self):
        return f"Predicción {self.product.name} - {self.requested_at}"

class DemandPrediction(models.Model):
    """Modelo para almacenar predicciones de demanda"""
    # Relaciones
    product = models.ForeignKey(Product, on_delete=models.CASCADE, verbose_name="Producto")
    prediction_request = models.ForeignKey(PredictionRequest, on_delete=models.CASCADE, null=True, blank=True, verbose_name="Solicitud")
    
    # Período de predicción
    prediction_date = models.DateField(verbose_name="Fecha de predicción")
    prediction_period = models.CharField(max_length=20, choices=[
        ('DAILY', 'Diario'),
        ('WEEKLY', 'Semanal'),
        ('MONTHLY', 'Mensual'),
    ], default='DAILY', verbose_name="Período")
    
    # Valores predichos
    predicted_quantity = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Cantidad predicha")
    lower_bound = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Límite inferior")
    upper_bound = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Límite superior")
    
    # Valores reales (para comparación posterior)
    actual_quantity = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Cantidad real")
    
    # Métricas de error
    error = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Error absoluto")
    error_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, verbose_name="Error porcentual")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Fecha de actualización")
    
    class Meta:
        verbose_name = "Predicción de demanda"
        verbose_name_plural = "Predicciones de demanda"
        ordering = ['product', 'prediction_date']
        unique_together = ['product', 'prediction_date', 'prediction_period']
    
    def __str__(self):
        return f"{self.product.name} - {self.prediction_date} - {self.predicted_quantity}"
    
    def calculate_error(self):
        """Calcula el error si hay valor real disponible"""
        if self.actual_quantity is not None:
            self.error = abs(self.predicted_quantity - self.actual_quantity)
            if self.actual_quantity > 0:
                self.error_percentage = (self.error / self.actual_quantity) * 100

class ModelPerformance(models.Model):
    """Modelo para rastrear el rendimiento de los modelos ML"""
    # Relaciones
    model = models.ForeignKey(MLModel, on_delete=models.CASCADE, verbose_name="Modelo")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, null=True, blank=True, verbose_name="Producto")
    
    # Período de evaluación
    evaluation_date = models.DateField(verbose_name="Fecha de evaluación")
    evaluation_period = models.CharField(max_length=20, choices=[
        ('DAILY', 'Diario'),
        ('WEEKLY', 'Semanal'),
        ('MONTHLY', 'Mensual'),
    ], verbose_name="Período de evaluación")
    
    # Métricas
    mae = models.DecimalField(max_digits=10, decimal_places=4, verbose_name="MAE (Error Absoluto Medio)")
    rmse = models.DecimalField(max_digits=10, decimal_places=4, verbose_name="RMSE (Error Cuadrático Medio)")
    mape = models.DecimalField(max_digits=5, decimal_places=2, verbose_name="MAPE (%)")
    r2_score = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True, verbose_name="R² Score")
    
    # Información adicional
    predictions_count = models.IntegerField(verbose_name="Cantidad de predicciones")
    notes = models.TextField(blank=True, verbose_name="Observaciones")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")
    
    class Meta:
        verbose_name = "Rendimiento del modelo"
        verbose_name_plural = "Rendimientos de modelos"
        ordering = ['-evaluation_date']
    
    def __str__(self):
        return f"{self.model.name} - {self.evaluation_date} - MAPE: {self.mape}%"