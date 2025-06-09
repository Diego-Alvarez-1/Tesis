from django.contrib import admin
from django.utils.html import format_html
from .models import Customer, Sale, SaleItem, DailySummary

class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 1
    fields = ['product', 'quantity', 'unit_price', 'discount_percentage', 'total_price']
    readonly_fields = ['total_price']

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'document_number', 'phone', 'customer_type', 'total_purchases', 'last_purchase_date']
    list_filter = ['customer_type', 'is_active', 'created_at']
    search_fields = ['first_name', 'last_name', 'document_number', 'email', 'phone']
    readonly_fields = ['total_purchases', 'purchase_count', 'last_purchase_date', 'average_purchase', 'available_credit']
    
    fieldsets = (
        ('Información Personal', {
            'fields': ('first_name', 'last_name', 'document_type', 'document_number', 'birth_date')
        }),
        ('Contacto', {
            'fields': ('phone', 'email', 'address')
        }),
        ('Información Comercial', {
            'fields': ('customer_type', 'credit_limit', 'current_debt', 'available_credit')
        }),
        ('Estadísticas', {
            'fields': ('total_purchases', 'purchase_count', 'average_purchase', 'last_purchase_date')
        }),
        ('Estado', {
            'fields': ('is_active', 'created_at', 'updated_at')
        }),
    )
    
    def full_name(self, obj):
        return obj.full_name
    full_name.short_description = 'Nombre Completo'

@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ['sale_number', 'customer', 'total', 'payment_method', 'status', 'sale_date']
    list_filter = ['status', 'payment_method', 'sale_date']
    search_fields = ['sale_number', 'customer__first_name', 'customer__last_name', 'invoice_number']
    date_hierarchy = 'sale_date'
    readonly_fields = ['subtotal', 'discount_amount', 'tax', 'total', 'created_at', 'updated_at']
    inlines = [SaleItemInline]
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('sale_number', 'customer', 'seller', 'sale_date')
        }),
        ('Pago', {
            'fields': ('payment_method', 'status', 'invoice_number')
        }),
        ('Montos', {
            'fields': ('subtotal', 'discount_percentage', 'discount_amount', 'tax', 'total')
        }),
        ('Notas', {
            'fields': ('notes',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:  # Si es nueva venta
            obj.seller = request.user
        super().save_model(request, obj, form, change)
    
    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        # Recalcular totales después de guardar los items
        form.instance.calculate_totals()
        form.instance.save()

@admin.register(DailySummary)
class DailySummaryAdmin(admin.ModelAdmin):
    list_display = ['date', 'total_sales', 'sale_count', 'products_sold', 'profit_margin_display']
    list_filter = ['date']
    date_hierarchy = 'date'
    readonly_fields = [field.name for field in DailySummary._meta.fields if field.name != 'id']
    
    def profit_margin_display(self, obj):
        color = 'green' if obj.profit_margin > 20 else 'orange' if obj.profit_margin > 10 else 'red'
        return format_html(
            '<span style="color: {};">{:.2f}%</span>',
            color,
            obj.profit_margin
        )
    profit_margin_display.short_description = 'Margen de Ganancia'
    
    def has_add_permission(self, request):
        return False  # No permitir agregar manualmente
    
    def has_delete_permission(self, request, obj=None):
        return False  # No permitir eliminar