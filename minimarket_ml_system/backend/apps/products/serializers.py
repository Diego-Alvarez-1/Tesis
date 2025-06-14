# Archivo: minimarket_ml_system/backend/apps/products/serializers.py

from rest_framework import serializers
from .models import Category, Supplier, Product

class CategorySerializer(serializers.ModelSerializer):
    """Serializer para categorías"""
    product_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Category
        fields = [
            'id', 'name', 'description', 'is_active', 
            'created_at', 'updated_at', 'product_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_product_count(self, obj):
        return obj.product_set.filter(is_active=True).count()

class SupplierSerializer(serializers.ModelSerializer):
    """Serializer para proveedores"""
    product_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Supplier
        fields = [
            'id', 'name', 'ruc', 'phone', 'email', 'address', 
            'is_active', 'created_at', 'updated_at', 'product_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_product_count(self, obj):
        return obj.product_set.filter(is_active=True).count()
    
    def validate_ruc(self, value):
        if len(value) != 11:
            raise serializers.ValidationError("RUC debe tener 11 dígitos")
        if not value.isdigit():
            raise serializers.ValidationError("RUC debe contener solo números")
        return value

class ProductSerializer(serializers.ModelSerializer):
    """Serializer para productos"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    profit_margin = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    stock_status = serializers.CharField(read_only=True)
    needs_reorder = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'code', 'barcode', 'name', 'description',
            'category', 'category_name', 'supplier', 'supplier_name',
            'cost_price', 'sale_price', 'profit_margin',
            'current_stock', 'min_stock', 'max_stock', 'reorder_point',
            'stock_status', 'needs_reorder', 'unit', 'units_per_box',
            'brand', 'weight', 'expiration_days', 'is_active', 'is_perishable',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'profit_margin', 'stock_status', 'needs_reorder']
    
    def validate(self, data):
        if data.get('cost_price', 0) < 0:
            raise serializers.ValidationError("El precio de costo no puede ser negativo")
        
        if data.get('sale_price', 0) <= data.get('cost_price', 0):
            raise serializers.ValidationError("El precio de venta debe ser mayor al precio de costo")
        
        if data.get('min_stock', 0) > data.get('max_stock', 0):
            raise serializers.ValidationError("El stock mínimo no puede ser mayor al stock máximo")
        
        return data

class ProductStockUpdateSerializer(serializers.Serializer):
    """Serializer para actualizar stock"""
    quantity = serializers.IntegerField()
    reason = serializers.CharField(max_length=200, required=False)
    
    def validate_quantity(self, value):
        if value == 0:
            raise serializers.ValidationError("La cantidad no puede ser cero")
        return value

class ProductSummarySerializer(serializers.ModelSerializer):
    """Serializer resumido para productos"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    stock_status = serializers.CharField(read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 'code', 'name', 'category_name', 'sale_price',
            'current_stock', 'stock_status', 'is_active'
        ]