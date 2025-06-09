from django.contrib import admin
from .models import StockMovement, PurchaseOrder, PurchaseOrderItem, InventoryCount, InventoryCountItem

class PurchaseOrderItemInline(admin.TabularInline):
    model = PurchaseOrderItem
    extra = 1
    fields = ['product', 'quantity_ordered', 'unit_price', 'total_price', 'quantity_received', 'is_received']
    readonly_fields = ['total_price']

class InventoryCountItemInline(admin.TabularInline):
    model = InventoryCountItem
    extra = 0
    fields = ['product', 'system_quantity', 'counted_quantity', 'difference', 'notes']
    readonly_fields = ['system_quantity', 'difference']

@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ['product', 'movement_type', 'quantity', 'stock_before', 'stock_after', 'movement_date', 'user']
    list_filter = ['movement_type', 'reason', 'movement_date']
    search_fields = ['product__name', 'product__code', 'notes']
    date_hierarchy = 'movement_date'
    readonly_fields = ['created_at']
    
    fieldsets = (
        ('Información del Movimiento', {
            'fields': ('product', 'movement_type', 'reason', 'quantity', 'user')
        }),
        ('Stock', {
            'fields': ('stock_before', 'stock_after')
        }),
        ('Costos', {
            'fields': ('unit_cost', 'total_cost')
        }),
        ('Información Adicional', {
            'fields': ('reference_document', 'notes', 'movement_date')
        }),
    )

@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'supplier', 'status', 'order_date', 'total', 'created_by']
    list_filter = ['status', 'supplier', 'order_date']
    search_fields = ['order_number', 'supplier__name']
    date_hierarchy = 'order_date'
    readonly_fields = ['subtotal', 'tax', 'total', 'created_at', 'updated_at']
    inlines = [PurchaseOrderItemInline]
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('order_number', 'supplier', 'status')
        }),
        ('Fechas', {
            'fields': ('order_date', 'expected_date', 'received_date')
        }),
        ('Totales', {
            'fields': ('subtotal', 'tax', 'total')
        }),
        ('Información Adicional', {
            'fields': ('notes', 'created_by', 'approved_by')
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:  # Si es nuevo
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

@admin.register(InventoryCount)
class InventoryCountAdmin(admin.ModelAdmin):
    list_display = ['count_number', 'description', 'status', 'scheduled_date', 'responsible']
    list_filter = ['status', 'scheduled_date']
    search_fields = ['count_number', 'description']
    date_hierarchy = 'scheduled_date'
    readonly_fields = ['created_at', 'updated_at']
    inlines = [InventoryCountItemInline]
    filter_horizontal = ['participants']
    
    fieldsets = (
        ('Información Básica', {
            'fields': ('count_number', 'description', 'status')
        }),
        ('Fechas', {
            'fields': ('scheduled_date', 'start_date', 'end_date')
        }),
        ('Personal', {
            'fields': ('responsible', 'participants')
        }),
        ('Notas', {
            'fields': ('notes',)
        }),
    )