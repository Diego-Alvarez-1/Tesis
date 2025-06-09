from django.contrib import admin
from .models import Category, Supplier, Product

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']
    ordering = ['name']

@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ['name', 'ruc', 'phone', 'email', 'is_active']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'ruc', 'email']
    ordering = ['name']

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'category', 'sale_price', 'current_stock', 'stock_status', 'is_active']
    list_filter = ['category', 'supplier', 'is_active', 'is_perishable', 'created_at']
    search_fields = ['code', 'barcode', 'name', 'description']
    list_editable = ['sale_price', 'current_stock']
    readonly_fields = ['profit_margin', 'stock_status', 'needs_reorder', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('code', 'barcode', 'name', 'description', 'category', 'supplier')
        }),
        ('Precios', {
            'fields': ('cost_price', 'sale_price', 'profit_margin')
        }),
        ('Control de Inventario', {
            'fields': ('current_stock', 'min_stock', 'max_stock', 'reorder_point', 'stock_status', 'needs_reorder')
        }),
        ('Detalles Adicionales', {
            'fields': ('unit', 'units_per_box', 'brand', 'weight', 'expiration_days', 'is_perishable')
        }),
        ('Estado', {
            'fields': ('is_active', 'created_at', 'updated_at')
        }),
    )
    
    def stock_status(self, obj):
        status = obj.stock_status
        colors = {
            'SIN_STOCK': 'red',
            'STOCK_BAJO': 'orange',
            'NORMAL': 'green',
            'SOBRESTOCK': 'blue'
        }
        return f'<span style="color: {colors.get(status, "black")}">{status}</span>'
    
    stock_status.allow_tags = True
    stock_status.short_description = 'Estado de Stock'