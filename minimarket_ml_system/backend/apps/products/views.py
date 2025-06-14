# Archivo: minimarket_ml_system/backend/apps/products/views.py

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Count, Sum, Avg
from django.shortcuts import get_object_or_404
from datetime import datetime, timedelta

from .models import Category, Supplier, Product
from .serializers import (
    CategorySerializer, SupplierSerializer, ProductSerializer,
    ProductStockUpdateSerializer, ProductSummarySerializer
)

class CategoryViewSet(viewsets.ModelViewSet):
    """ViewSet para categorías"""
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = []
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtros opcionales
        is_active = self.request.query_params.get('is_active')
        search = self.request.query_params.get('search')
        
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search)
            )
        
        return queryset.order_by('name')
    
    @action(detail=True, methods=['get'])
    def products(self, request, pk=None):
        """Obtiene productos de una categoría"""
        category = self.get_object()
        products = category.product_set.filter(is_active=True)
        
        serializer = ProductSummarySerializer(products, many=True)
        return Response({
            'category': CategorySerializer(category).data,
            'products_count': products.count(),
            'products': serializer.data
        })

class SupplierViewSet(viewsets.ModelViewSet):
    """ViewSet para proveedores"""
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = []
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtros opcionales
        is_active = self.request.query_params.get('is_active')
        search = self.request.query_params.get('search')
        
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(ruc__icontains=search) |
                Q(email__icontains=search)
            )
        
        return queryset.order_by('name')
    
    @action(detail=True, methods=['get'])
    def products(self, request, pk=None):
        """Obtiene productos de un proveedor"""
        supplier = self.get_object()
        products = supplier.product_set.filter(is_active=True)
        
        serializer = ProductSummarySerializer(products, many=True)
        return Response({
            'supplier': SupplierSerializer(supplier).data,
            'products_count': products.count(),
            'products': serializer.data
        })

class ProductViewSet(viewsets.ModelViewSet):
    """ViewSet para productos"""
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = []
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtros opcionales
        category = self.request.query_params.get('category')
        supplier = self.request.query_params.get('supplier')
        is_active = self.request.query_params.get('is_active')
        stock_status = self.request.query_params.get('stock_status')
        search = self.request.query_params.get('search')
        needs_reorder = self.request.query_params.get('needs_reorder')
        
        if category:
            queryset = queryset.filter(category_id=category)
        
        if supplier:
            queryset = queryset.filter(supplier_id=supplier)
        
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        if stock_status:
            # Aplicar filtro de stock_status después de evaluar la propiedad
            product_ids = []
            for product in queryset:
                if product.stock_status == stock_status:
                    product_ids.append(product.id)
            queryset = queryset.filter(id__in=product_ids)
        
        if needs_reorder is not None:
            # Filtrar productos que necesitan reorden
            if needs_reorder.lower() == 'true':
                product_ids = []
                for product in queryset:
                    if product.needs_reorder:
                        product_ids.append(product.id)
                queryset = queryset.filter(id__in=product_ids)
        
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(code__icontains=search) |
                Q(barcode__icontains=search) |
                Q(description__icontains=search) |
                Q(brand__icontains=search)
            )
        
        return queryset.order_by('name')
    
    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Productos con stock bajo"""
        products = []
        for product in Product.objects.filter(is_active=True):
            if product.stock_status in ['SIN_STOCK', 'STOCK_BAJO'] or product.needs_reorder:
                products.append(product)
        
        serializer = ProductSerializer(products, many=True)
        return Response({
            'count': len(products),
            'products': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Productos agrupados por categoría"""
        categories = Category.objects.filter(is_active=True).prefetch_related('product_set')
        
        result = []
        for category in categories:
            products = category.product_set.filter(is_active=True)
            result.append({
                'category': CategorySerializer(category).data,
                'products_count': products.count(),
                'products': ProductSummarySerializer(products, many=True).data
            })
        
        return Response(result)
    
    @action(detail=True, methods=['post'])
    def update_stock(self, request, pk=None):
        """Actualiza el stock de un producto"""
        product = self.get_object()
        serializer = ProductStockUpdateSerializer(data=request.data)
        
        if serializer.is_valid():
            quantity = serializer.validated_data['quantity']
            reason = serializer.validated_data.get('reason', 'Ajuste manual')
            
            # Determinar tipo de movimiento
            if quantity > 0:
                movement_type = 'IN'
                movement_reason = 'INVENTORY_ADJUST'
            else:
                movement_type = 'OUT'
                movement_reason = 'INVENTORY_ADJUST'
                quantity = abs(quantity)
            
            # Crear movimiento de stock
            from apps.inventory.models import StockMovement
            stock_before = product.current_stock
            
            if movement_type == 'IN':
                product.current_stock += quantity
            else:
                product.current_stock = max(0, product.current_stock - quantity)
            
            product.save()
            
            StockMovement.objects.create(
                product=product,
                movement_type=movement_type,
                reason=movement_reason,
                quantity=quantity,
                stock_before=stock_before,
                stock_after=product.current_stock,
                notes=reason,
                user=request.user
            )
            
            return Response({
                'success': True,
                'message': f'Stock actualizado para {product.name}',
                'stock_before': stock_before,
                'stock_after': product.current_stock,
                'stock_status': product.stock_status
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Estadísticas para dashboard"""
        total_products = Product.objects.filter(is_active=True).count()
        low_stock_products = len([p for p in Product.objects.filter(is_active=True) if p.needs_reorder])
        out_of_stock = len([p for p in Product.objects.filter(is_active=True) if p.stock_status == 'SIN_STOCK'])
        
        # Productos por categoría
        from .models import Category
        categories_stats = []
        for category in Category.objects.filter(is_active=True):
            products_count = category.product_set.filter(is_active=True).count()
            categories_stats.append({
                'category': category.name,
                'products_count': products_count
            })
        
        return Response({
            'total_products': total_products,
            'low_stock_products': low_stock_products,
            'out_of_stock_products': out_of_stock,
            'categories_stats': categories_stats
        })
    
    @action(detail=True, methods=['get'])
    def sales_history(self, request, pk=None):
        """Historial de ventas de un producto"""
        product = self.get_object()
        days = int(request.query_params.get('days', 30))
        
        from apps.sales.models import SaleItem
        from django.db.models import Sum, Count
        
        start_date = datetime.now() - timedelta(days=days)
        
        sales_data = SaleItem.objects.filter(
            product=product,
            sale__sale_date__gte=start_date,
            sale__status='COMPLETED'
        ).values('sale__sale_date__date').annotate(
            quantity_sold=Sum('quantity'),
            sales_count=Count('sale', distinct=True),
            revenue=Sum('total_price')
        ).order_by('sale__sale_date__date')
        
        total_sold = sum(item['quantity_sold'] for item in sales_data)
        total_revenue = sum(item['revenue'] for item in sales_data)
        
        return Response({
            'product': ProductSerializer(product).data,
            'period_days': days,
            'total_sold': total_sold,
            'total_revenue': float(total_revenue),
            'daily_sales': list(sales_data)
        })