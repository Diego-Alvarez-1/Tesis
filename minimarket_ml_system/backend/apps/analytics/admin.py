from django.contrib import admin
from django.utils.html import format_html
from .models import Report, Dashboard, Widget, Alert, KPI

class WidgetInline(admin.TabularInline):
    model = Widget
    extra = 0
    fields = ['title', 'widget_type', 'data_source', 'position_x', 'position_y', 'width', 'height', 'is_active']

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ['name', 'report_type', 'start_date', 'end_date', 'file_format', 'generated_by', 'created_at']
    list_filter = ['report_type', 'file_format', 'created_at']
    search_fields = ['name', 'description']
    date_hierarchy = 'created_at'
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Información del Reporte', {
            'fields': ('name', 'report_type', 'description')
        }),
        ('Período', {
            'fields': ('start_date', 'end_date')
        }),
        ('Archivo', {
            'fields': ('file_format', 'file')
        }),
        ('Configuración', {
            'fields': ('filters', 'parameters')
        }),
        ('Metadata', {
            'fields': ('generated_by', 'created_at')
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:
            obj.generated_by = request.user
        super().save_model(request, obj, form, change)

@admin.register(Dashboard)
class DashboardAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'is_default', 'is_public', 'widget_count', 'created_at']
    list_filter = ['is_default', 'is_public', 'created_at']
    search_fields = ['name', 'description', 'user__username']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [WidgetInline]
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('name', 'description', 'user')
        }),
        ('Configuración', {
            'fields': ('is_default', 'is_public', 'layout')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def widget_count(self, obj):
        return obj.widgets.count()
    widget_count.short_description = 'Widgets'

@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ['title', 'alert_type', 'severity_display', 'product', 'is_resolved', 'created_at']
    list_filter = ['alert_type', 'severity', 'is_read', 'is_resolved', 'created_at']
    search_fields = ['title', 'message', 'product__name']
    date_hierarchy = 'created_at'
    readonly_fields = ['created_at', 'updated_at', 'resolved_at']
    
    fieldsets = (
        ('Información de Alerta', {
            'fields': ('alert_type', 'severity', 'title', 'message')
        }),
        ('Relaciones', {
            'fields': ('product', 'user')
        }),
        ('Estado', {
            'fields': ('is_read', 'is_resolved', 'resolved_by', 'resolved_at')
        }),
        ('Datos Adicionales', {
            'fields': ('data',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def severity_display(self, obj):
        colors = {
            'INFO': 'blue',
            'WARNING': 'orange',
            'CRITICAL': 'red'
        }
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            colors.get(obj.severity, 'black'),
            obj.get_severity_display()
        )
    severity_display.short_description = 'Severidad'
    
    actions = ['mark_as_resolved']
    
    def mark_as_resolved(self, request, queryset):
        from django.utils import timezone
        count = queryset.update(
            is_resolved=True,
            resolved_by=request.user,
            resolved_at=timezone.now()
        )
        self.message_user(request, f'{count} alertas marcadas como resueltas.')
    mark_as_resolved.short_description = 'Marcar como resueltas'

@admin.register(KPI)
class KPIAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'current_value_display', 'target_value', 'achievement_display', 'trend_display', 'last_calculated']
    list_filter = ['category', 'trend', 'is_active', 'update_frequency']
    search_fields = ['name', 'description']
    readonly_fields = ['achievement_percentage', 'variation_percentage', 'last_calculated', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('name', 'description', 'category')
        }),
        ('Configuración', {
            'fields': ('formula', 'unit', 'target_value', 'update_frequency')
        }),
        ('Valores', {
            'fields': ('current_value', 'previous_value', 'trend')
        }),
        ('Métricas Calculadas', {
            'fields': ('achievement_percentage', 'variation_percentage')
        }),
        ('Estado', {
            'fields': ('is_active', 'last_calculated')
        }),
    )
    
    def current_value_display(self, obj):
        return f"{obj.current_value} {obj.unit}"
    current_value_display.short_description = 'Valor Actual'
    
    def achievement_display(self, obj):
        percentage = obj.achievement_percentage
        if percentage > 0:
            color = 'green' if percentage >= 90 else 'orange' if percentage >= 70 else 'red'
            return format_html(
                '<span style="color: {};">{:.1f}%</span>',
                color,
                percentage
            )
        return '-'
    achievement_display.short_description = 'Logro %'
    
    def trend_display(self, obj):
        icons = {
            'UP': '↑',
            'DOWN': '↓',
            'STABLE': '→'
        }
        colors = {
            'UP': 'green',
            'DOWN': 'red',
            'STABLE': 'gray'
        }
        return format_html(
            '<span style="color: {}; font-size: 16px;">{}</span>',
            colors.get(obj.trend, 'black'),
            icons.get(obj.trend, '?')
        )
    trend_display.short_description = 'Tendencia'