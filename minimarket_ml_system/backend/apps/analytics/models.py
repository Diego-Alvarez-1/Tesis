from django.db import models
from django.contrib.auth.models import User
from apps.products.models import Product, Category
from apps.sales.models import Customer
import json

class Report(models.Model):
    """Modelo para reportes generados"""
    REPORT_TYPES = [
        ('SALES', 'Reporte de Ventas'),
        ('INVENTORY', 'Reporte de Inventario'),
        ('PREDICTION', 'Reporte de Predicciones'),
        ('PERFORMANCE', 'Reporte de Rendimiento'),
        ('FINANCIAL', 'Reporte Financiero'),
        ('CUSTOMER', 'Reporte de Clientes'),
    ]
    
    REPORT_FORMATS = [
        ('PDF', 'PDF'),
        ('EXCEL', 'Excel'),
        ('CSV', 'CSV'),
        ('JSON', 'JSON'),
    ]
    
    # Información básica
    name = models.CharField(max_length=200, verbose_name="Nombre del reporte")
    report_type = models.CharField(max_length=20, choices=REPORT_TYPES, verbose_name="Tipo de reporte")
    description = models.TextField(blank=True, verbose_name="Descripción")
    
    # Período
    start_date = models.DateField(verbose_name="Fecha inicio")
    end_date = models.DateField(verbose_name="Fecha fin")
    
    # Archivo
    file_format = models.CharField(max_length=10, choices=REPORT_FORMATS, verbose_name="Formato")
    file = models.FileField(upload_to='reports/', null=True, blank=True, verbose_name="Archivo")
    
    # Configuración
    filters = models.JSONField(default=dict, verbose_name="Filtros aplicados")
    parameters = models.JSONField(default=dict, verbose_name="Parámetros")
    
    # Usuario
    generated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name="Generado por")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de generación")
    
    class Meta:
        verbose_name = "Reporte"
        verbose_name_plural = "Reportes"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} - {self.get_report_type_display()}"

class Dashboard(models.Model):
    """Modelo para configuración de dashboards personalizados"""
    # Información básica
    name = models.CharField(max_length=100, verbose_name="Nombre del dashboard")
    description = models.TextField(blank=True, verbose_name="Descripción")
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Usuario")
    
    # Configuración
    is_default = models.BooleanField(default=False, verbose_name="Dashboard por defecto")
    is_public = models.BooleanField(default=False, verbose_name="Dashboard público")
    layout = models.JSONField(default=dict, verbose_name="Configuración de layout")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Fecha de actualización")
    
    class Meta:
        verbose_name = "Dashboard"
        verbose_name_plural = "Dashboards"
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} - {self.user.username}"

class Widget(models.Model):
    """Modelo para widgets del dashboard"""
    WIDGET_TYPES = [
        ('CHART_LINE', 'Gráfico de Líneas'),
        ('CHART_BAR', 'Gráfico de Barras'),
        ('CHART_PIE', 'Gráfico Circular'),
        ('METRIC', 'Métrica Simple'),
        ('TABLE', 'Tabla'),
        ('HEATMAP', 'Mapa de Calor'),
        ('GAUGE', 'Indicador'),
    ]
    
    DATA_SOURCES = [
        ('SALES', 'Ventas'),
        ('INVENTORY', 'Inventario'),
        ('PREDICTIONS', 'Predicciones'),
        ('CUSTOMERS', 'Clientes'),
        ('PRODUCTS', 'Productos'),
    ]
    
    # Información básica
    dashboard = models.ForeignKey(Dashboard, on_delete=models.CASCADE, related_name='widgets', verbose_name="Dashboard")
    title = models.CharField(max_length=100, verbose_name="Título")
    widget_type = models.CharField(max_length=20, choices=WIDGET_TYPES, verbose_name="Tipo de widget")
    
    # Configuración
    data_source = models.CharField(max_length=20, choices=DATA_SOURCES, verbose_name="Fuente de datos")
    query_config = models.JSONField(default=dict, verbose_name="Configuración de consulta")
    display_config = models.JSONField(default=dict, verbose_name="Configuración de visualización")
    
    # Posición
    position_x = models.IntegerField(default=0, verbose_name="Posición X")
    position_y = models.IntegerField(default=0, verbose_name="Posición Y")
    width = models.IntegerField(default=4, verbose_name="Ancho")
    height = models.IntegerField(default=4, verbose_name="Alto")
    
    # Estado
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    refresh_interval = models.IntegerField(default=300, verbose_name="Intervalo de actualización (segundos)")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Fecha de actualización")
    
    class Meta:
        verbose_name = "Widget"
        verbose_name_plural = "Widgets"
        ordering = ['dashboard', 'position_y', 'position_x']
    
    def __str__(self):
        return f"{self.title} - {self.get_widget_type_display()}"

class Alert(models.Model):
    """Modelo para alertas del sistema"""
    ALERT_TYPES = [
        ('LOW_STOCK', 'Stock Bajo'),
        ('OVERSTOCK', 'Sobrestock'),
        ('EXPIRATION', 'Producto por Vencer'),
        ('PREDICTION', 'Alerta de Predicción'),
        ('SALES_TARGET', 'Meta de Ventas'),
        ('SYSTEM', 'Alerta del Sistema'),
    ]
    
    SEVERITY_LEVELS = [
        ('INFO', 'Información'),
        ('WARNING', 'Advertencia'),
        ('CRITICAL', 'Crítico'),
    ]
    
    # Información básica
    alert_type = models.CharField(max_length=20, choices=ALERT_TYPES, verbose_name="Tipo de alerta")
    severity = models.CharField(max_length=10, choices=SEVERITY_LEVELS, verbose_name="Severidad")
    title = models.CharField(max_length=200, verbose_name="Título")
    message = models.TextField(verbose_name="Mensaje")
    
    # Relaciones opcionales
    product = models.ForeignKey(Product, on_delete=models.CASCADE, null=True, blank=True, verbose_name="Producto")
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, verbose_name="Usuario")
    
    # Estado
    is_read = models.BooleanField(default=False, verbose_name="Leído")
    is_resolved = models.BooleanField(default=False, verbose_name="Resuelto")
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_alerts', verbose_name="Resuelto por")
    resolved_at = models.DateTimeField(null=True, blank=True, verbose_name="Fecha de resolución")
    
    # Datos adicionales
    data = models.JSONField(default=dict, verbose_name="Datos adicionales")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Fecha de actualización")
    
    class Meta:
        verbose_name = "Alerta"
        verbose_name_plural = "Alertas"
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.get_alert_type_display()} - {self.title}"

class KPI(models.Model):
    """Modelo para KPIs (Key Performance Indicators)"""
    KPI_CATEGORIES = [
        ('SALES', 'Ventas'),
        ('INVENTORY', 'Inventario'),
        ('FINANCIAL', 'Financiero'),
        ('OPERATIONAL', 'Operacional'),
        ('CUSTOMER', 'Clientes'),
    ]
    
    # Información básica
    name = models.CharField(max_length=100, verbose_name="Nombre del KPI")
    description = models.TextField(blank=True, verbose_name="Descripción")
    category = models.CharField(max_length=20, choices=KPI_CATEGORIES, verbose_name="Categoría")
    
    # Configuración
    formula = models.TextField(verbose_name="Fórmula o cálculo")
    unit = models.CharField(max_length=20, verbose_name="Unidad de medida")
    target_value = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Valor objetivo")
    
    # Valores actuales
    current_value = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Valor actual")
    previous_value = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Valor anterior")
    
    # Tendencia
    trend = models.CharField(max_length=10, choices=[
        ('UP', 'Ascendente'),
        ('DOWN', 'Descendente'),
        ('STABLE', 'Estable'),
    ], default='STABLE', verbose_name="Tendencia")
    
    # Estado
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    update_frequency = models.CharField(max_length=20, choices=[
        ('REALTIME', 'Tiempo Real'),
        ('HOURLY', 'Cada Hora'),
        ('DAILY', 'Diario'),
        ('WEEKLY', 'Semanal'),
        ('MONTHLY', 'Mensual'),
    ], default='DAILY', verbose_name="Frecuencia de actualización")
    
    # Timestamps
    last_calculated = models.DateTimeField(null=True, blank=True, verbose_name="Última actualización")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Fecha de actualización")
    
    class Meta:
        verbose_name = "KPI"
        verbose_name_plural = "KPIs"
        ordering = ['category', 'name']
    
    def __str__(self):
        return f"{self.name} - {self.current_value} {self.unit}"
    
    @property
    def achievement_percentage(self):
        """Calcula el porcentaje de logro respecto al objetivo"""
        if self.target_value and self.target_value > 0:
            return (self.current_value / self.target_value) * 100
        return 0
    
    @property
    def variation_percentage(self):
        """Calcula la variación porcentual respecto al valor anterior"""
        if self.previous_value and self.previous_value > 0:
            return ((self.current_value - self.previous_value) / self.previous_value) * 100
        return 0