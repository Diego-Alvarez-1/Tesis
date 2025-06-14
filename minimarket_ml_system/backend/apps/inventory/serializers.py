# Archivo: minimarket_ml_system/backend/apps/inventory/serializers.py

from rest_framework import serializers
from .models import StockMovement, PurchaseOrder, PurchaseOrderItem, InventoryCount, InventoryCountItem

class StockMovementSerializer(serializers.ModelSerializer):
    """Serializer para movimientos de stock"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_code = serializers.CharField(source='product.code', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    movement_type_display = serializers.CharField(source='get_movement_type_display', read_only=True)
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    
    class Meta:
        model = StockMovement
        fields = [
            'id', 'product', 'product_name', 'product_code',
            'movement_type', 'movement_type_display', 'reason', 'reason_display',
            'quantity', 'stock_before', 'stock_after', 'unit_cost', 'total_cost',
            'notes', 'reference_document', 'movement_date', 'user', 'user_name',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    """Serializer para items de orden de compra"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_code = serializers.CharField(source='product.code', read_only=True)
    
    class Meta:
        model = PurchaseOrderItem
        fields = [
            'id', 'product', 'product_name', 'product_code',
            'quantity_ordered', 'quantity_received', 'unit_price',
            'total_price', 'is_received', 'received_date'
        ]
        read_only_fields = ['id', 'total_price', 'is_received', 'received_date']

class PurchaseOrderSerializer(serializers.ModelSerializer):
    """Serializer para órdenes de compra"""
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.username', read_only=True)
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    items_count = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = PurchaseOrder
        fields = [
            'id', 'order_number', 'supplier', 'supplier_name', 'status', 'status_display',
            'order_date', 'expected_date', 'received_date', 'subtotal', 'tax', 'total',
            'notes', 'created_by', 'created_by_name', 'approved_by', 'approved_by_name',
            'items_count', 'created_at', 'updated_at', 'items'
        ]
        read_only_fields = [
            'id', 'order_number', 'subtotal', 'tax', 'total',
            'created_by', 'created_at', 'updated_at'
        ]
    
    def get_items_count(self, obj):
        return obj.items.count()

class InventoryCountItemSerializer(serializers.ModelSerializer):
    """Serializer para items de conteo"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_code = serializers.CharField(source='product.code', read_only=True)
    counted_by_name = serializers.CharField(source='counted_by.username', read_only=True)
    
    class Meta:
        model = InventoryCountItem
        fields = [
            'id', 'product', 'product_name', 'product_code',
            'system_quantity', 'counted_quantity', 'difference',
            'notes', 'counted_by', 'counted_by_name', 'counted_at'
        ]
        read_only_fields = ['id', 'system_quantity', 'difference']

class InventoryCountSerializer(serializers.ModelSerializer):
    """Serializer para conteos de inventario"""
    responsible_name = serializers.CharField(source='responsible.username', read_only=True)
    participants_names = serializers.SerializerMethodField()
    items = InventoryCountItemSerializer(many=True, read_only=True)
    items_count = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = InventoryCount
        fields = [
            'id', 'count_number', 'description', 'status', 'status_display',
            'scheduled_date', 'start_date', 'end_date', 'responsible', 'responsible_name',
            'participants', 'participants_names', 'items_count', 'notes',
            'created_at', 'updated_at', 'items'
        ]
        read_only_fields = ['id', 'count_number', 'created_at', 'updated_at']
    
    def get_participants_names(self, obj):
        return [user.username for user in obj.participants.all()]
    
    def get_items_count(self, obj):
        return obj.items.count()

class StockAdjustmentSerializer(serializers.Serializer):
    """Serializer para ajustes de stock"""
    product = serializers.IntegerField()
    new_quantity = serializers.IntegerField(min_value=0)
    reason = serializers.CharField(max_length=200)
    notes = serializers.CharField(max_length=500, required=False, allow_blank=True)
    
    def validate_product(self, value):
        from apps.products.models import Product
        try:
            Product.objects.get(id=value, is_active=True)
        except Product.DoesNotExist:
            raise serializers.ValidationError("Producto no encontrado o inactivo")
        return value

class LowStockReportSerializer(serializers.Serializer):
    """Serializer para reporte de stock bajo"""
    product_id = serializers.IntegerField()
    product_code = serializers.CharField()
    product_name = serializers.CharField()
    category_name = serializers.CharField()
    current_stock = serializers.IntegerField()
    min_stock = serializers.IntegerField()
    reorder_point = serializers.IntegerField()
    stock_status = serializers.CharField()
    days_of_stock = serializers.DecimalField(max_digits=10, decimal_places=2)
    suggested_order = serializers.IntegerField()