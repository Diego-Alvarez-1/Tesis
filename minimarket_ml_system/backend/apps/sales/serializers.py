# Archivo: minimarket_ml_system/backend/apps/sales/serializers.py

from rest_framework import serializers
from .models import Customer, Sale, SaleItem, DailySummary
from apps.products.models import Product

class CustomerSerializer(serializers.ModelSerializer):
    """Serializer para clientes"""
    full_name = serializers.CharField(read_only=True)
    available_credit = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    average_purchase = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = Customer
        fields = [
            'id', 'first_name', 'last_name', 'full_name', 'document_type',
            'document_number', 'phone', 'email', 'address', 'customer_type',
            'credit_limit', 'current_debt', 'available_credit', 'total_purchases',
            'purchase_count', 'average_purchase', 'last_purchase_date',
            'is_active', 'birth_date', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'full_name', 'available_credit', 'total_purchases',
            'purchase_count', 'average_purchase', 'last_purchase_date',
            'created_at', 'updated_at'
        ]
    
    def validate_document_number(self, value):
        document_type = self.initial_data.get('document_type', 'DNI')
        
        if document_type == 'DNI' and len(value) != 8:
            raise serializers.ValidationError("DNI debe tener 8 dígitos")
        elif document_type == 'RUC' and len(value) != 11:
            raise serializers.ValidationError("RUC debe tener 11 dígitos")
        
        if not value.isdigit():
            raise serializers.ValidationError("El documento debe contener solo números")
        
        return value

class SaleItemSerializer(serializers.ModelSerializer):
    """Serializer para items de venta"""
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_code = serializers.CharField(source='product.code', read_only=True)
    
    class Meta:
        model = SaleItem
        fields = [
            'id', 'product', 'product_name', 'product_code',
            'quantity', 'unit_price', 'discount_percentage',
            'total_price', 'unit_cost', 'total_cost', 'profit', 'notes'
        ]
        read_only_fields = ['id', 'total_price', 'unit_cost', 'total_cost', 'profit']
    
    def validate_quantity(self, value):
        if value <= 0:
            raise serializers.ValidationError("La cantidad debe ser mayor a cero")
        return value
    
    def validate_unit_price(self, value):
        if value <= 0:
            raise serializers.ValidationError("El precio unitario debe ser mayor a cero")
        return value

class SaleCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear ventas"""
    items = SaleItemSerializer(many=True, required=True)
    
    class Meta:
        model = Sale
        fields = [
            'id', 'sale_number', 'customer', 'payment_method',
            'discount_percentage', 'notes', 'items'
        ]
        read_only_fields = ['id', 'sale_number']
    
    def validate_items(self, value):
        if not value:
            raise serializers.ValidationError("La venta debe tener al menos un item")
        return value
    
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        
        # Generar número de venta
        last_sale = Sale.objects.order_by('-id').first()
        if last_sale:
            sale_number = f"V{str(int(last_sale.sale_number[1:]) + 1).zfill(6)}"
        else:
            sale_number = "V000001"
        
        validated_data['sale_number'] = sale_number
        validated_data['seller'] = self.context['request'].user
        
        sale = Sale.objects.create(**validated_data)
        
        # Crear items
        for item_data in items_data:
            SaleItem.objects.create(sale=sale, **item_data)
        
        # Calcular totales
        sale.calculate_totals()
        sale.save()
        
        return sale

class SaleSerializer(serializers.ModelSerializer):
    """Serializer completo para ventas"""
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    seller_name = serializers.CharField(source='seller.username', read_only=True)
    items = SaleItemSerializer(many=True, read_only=True)
    items_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Sale
        fields = [
            'id', 'sale_number', 'customer', 'customer_name',
            'seller', 'seller_name', 'payment_method', 'status',
            'subtotal', 'discount_percentage', 'discount_amount',
            'tax', 'total', 'items_count', 'notes', 'invoice_number',
            'sale_date', 'created_at', 'updated_at', 'items'
        ]
        read_only_fields = [
            'id', 'sale_number', 'seller', 'subtotal', 'discount_amount',
            'tax', 'total', 'created_at', 'updated_at'
        ]
    
    def get_items_count(self, obj):
        return obj.items.count()

class DailySummarySerializer(serializers.ModelSerializer):
    """Serializer para resúmenes diarios"""
    
    class Meta:
        model = DailySummary
        fields = [
            'id', 'date', 'total_sales', 'sale_count', 'products_sold',
            'unique_products', 'cash_sales', 'card_sales', 'transfer_sales',
            'credit_sales', 'digital_wallet_sales', 'total_cost', 'total_profit',
            'profit_margin', 'average_sale', 'average_items_per_sale',
            'unique_customers', 'new_customers', 'peak_hour', 'peak_hour_sales',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class SaleSummarySerializer(serializers.ModelSerializer):
    """Serializer resumido para ventas"""
    customer_name = serializers.CharField(source='customer.full_name', read_only=True)
    
    class Meta:
        model = Sale
        fields = [
            'id', 'sale_number', 'customer_name', 'total',
            'payment_method', 'status', 'sale_date'
        ]