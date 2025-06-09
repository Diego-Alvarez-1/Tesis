from django.contrib import admin
from django.utils.html import format_html
from .models import MLModel, PredictionRequest, DemandPrediction, ModelPerformance

@admin.register(MLModel)
class MLModelAdmin(admin.ModelAdmin):
    list_display = ['name', 'model_type', 'version', 'is_active', 'is_default', 'training_date', 'created_by']
    list_filter = ['model_type', 'is_active', 'is_default', 'training_date']
    search_fields = ['name', 'description']
    readonly_fields = ['training_date', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('name', 'model_type', 'version', 'description')
        }),
        ('Archivo y Configuración', {
            'fields': ('model_file', 'parameters', 'metrics')
        }),
        ('Entrenamiento', {
            'fields': ('training_data_size', 'training_duration', 'training_date')
        }),
        ('Estado', {
            'fields': ('is_active', 'is_default', 'created_by')
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

@admin.register(PredictionRequest)
class PredictionRequestAdmin(admin.ModelAdmin):
    list_display = ['product', 'model_used', 'prediction_days', 'confidence_score', 'requested_at', 'completed_at']
    list_filter = ['model_used', 'requested_at', 'completed_at']
    search_fields = ['product__name', 'product__code']
    readonly_fields = ['requested_at', 'completed_at', 'processing_time']
    
    fieldsets = (
        ('Información de Solicitud', {
            'fields': ('product', 'model_used', 'user', 'prediction_days')
        }),
        ('Datos', {
            'fields': ('input_data', 'prediction_result', 'confidence_score')
        }),
        ('Tiempos', {
            'fields': ('requested_at', 'completed_at', 'processing_time')
        }),
        ('Notas', {
            'fields': ('notes',)
        }),
    )

@admin.register(DemandPrediction)
class DemandPredictionAdmin(admin.ModelAdmin):
    list_display = ['product', 'prediction_date', 'predicted_quantity', 'actual_quantity', 'error_percentage_display']
    list_filter = ['prediction_period', 'prediction_date', 'product__category']
    search_fields = ['product__name', 'product__code']
    date_hierarchy = 'prediction_date'
    readonly_fields = ['error', 'error_percentage', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Predicción', {
            'fields': ('product', 'prediction_request', 'prediction_date', 'prediction_period')
        }),
        ('Valores', {
            'fields': ('predicted_quantity', 'lower_bound', 'upper_bound', 'actual_quantity')
        }),
        ('Métricas', {
            'fields': ('error', 'error_percentage')
        }),
    )
    
    def error_percentage_display(self, obj):
        if obj.error_percentage is not None:
            color = 'green' if obj.error_percentage < 10 else 'orange' if obj.error_percentage < 20 else 'red'
            return format_html(
                '<span style="color: {};">{:.2f}%</span>',
                color,
                obj.error_percentage
            )
        return '-'
    error_percentage_display.short_description = 'Error %'

@admin.register(ModelPerformance)
class ModelPerformanceAdmin(admin.ModelAdmin):
    list_display = ['model', 'product', 'evaluation_date', 'mape_display', 'mae', 'rmse', 'predictions_count']
    list_filter = ['model', 'evaluation_period', 'evaluation_date']
    search_fields = ['model__name', 'product__name']
    date_hierarchy = 'evaluation_date'
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Evaluación', {
            'fields': ('model', 'product', 'evaluation_date', 'evaluation_period')
        }),
        ('Métricas', {
            'fields': ('mae', 'rmse', 'mape', 'r2_score', 'predictions_count')
        }),
        ('Observaciones', {
            'fields': ('notes',)
        }),
    )
    
    def mape_display(self, obj):
        color = 'green' if obj.mape < 10 else 'orange' if obj.mape < 20 else 'red'
        return format_html(
            '<span style="color: {};">{:.2f}%</span>',
            color,
            obj.mape
        )
    mape_display.short_description = 'MAPE'