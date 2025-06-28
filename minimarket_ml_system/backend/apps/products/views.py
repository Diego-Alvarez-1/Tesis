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
    """ViewSet para productos - CORREGIDO"""
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = []
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # CORRECCIÓN CRÍTICA: Manejo mejorado de filtros
        category = self.request.query_params.get('category')
        supplier = self.request.query_params.get('supplier')
        is_active = self.request.query_params.get('is_active')
        stock_status = self.request.query_params.get('stock_status')
        search = self.request.query_params.get('search')
        needs_reorder = self.request.query_params.get('needs_reorder')
        
        print(f"🔍 Filtros recibidos en backend:")
        print(f"  - category: {category}")
        print(f"  - supplier: {supplier}")
        print(f"  - is_active: {is_active}")
        print(f"  - stock_status: {stock_status}")
        print(f"  - search: {search}")
        print(f"  - needs_reorder: {needs_reorder}")
        
        # FILTRO POR CATEGORÍA
        if category and category.strip():
            try:
                category_id = int(category)
                queryset = queryset.filter(category_id=category_id)
                print(f"  ✅ Filtrado por categoría: {category_id}")
            except (ValueError, TypeError):
                print(f"  ❌ ID de categoría inválido: {category}")
        
        # FILTRO POR PROVEEDOR
        if supplier and supplier.strip():
            try:
                supplier_id = int(supplier)
                queryset = queryset.filter(supplier_id=supplier_id)
                print(f"  ✅ Filtrado por proveedor: {supplier_id}")
            except (ValueError, TypeError):
                print(f"  ❌ ID de proveedor inválido: {supplier}")
        
        # FILTRO POR ESTADO ACTIVO - CORREGIDO
        if is_active and is_active.strip() and is_active.lower() != 'all':
            is_active_bool = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active_bool)
            print(f"  ✅ Filtrado por is_active: {is_active_bool}")
        else:
            print(f"  ➡️ Sin filtro is_active (mostrando todos)")
        
        # FILTRO POR BÚSQUEDA
        if search and search.strip():
            search_term = search.strip()
            queryset = queryset.filter(
                Q(name__icontains=search_term) |
                Q(code__icontains=search_term) |
                Q(barcode__icontains=search_term) |
                Q(description__icontains=search_term) |
                Q(brand__icontains=search_term)
            )
            print(f"  ✅ Filtrado por búsqueda: '{search_term}'")
        
        # FILTRO POR ESTADO DE STOCK - MEJORADO
        if stock_status and stock_status.strip():
            # Obtener productos y evaluar stock_status en Python
            # ya que es una propiedad calculada
            products_ids = []
            all_products = queryset.only('id', 'current_stock', 'min_stock', 'max_stock')
            
            for product in all_products:
                if product.stock_status == stock_status:
                    products_ids.append(product.id)
            
            queryset = queryset.filter(id__in=products_ids)
            print(f"  ✅ Filtrado por stock_status: {stock_status} ({len(products_ids)} productos)")
        
        # FILTRO POR NECESIDAD DE REORDEN - MEJORADO
        if needs_reorder and needs_reorder.strip():
            needs_reorder_bool = needs_reorder.lower() == 'true'
            # Evaluar needs_reorder en Python ya que es una propiedad calculada
            products_ids = []
            all_products = queryset.only('id', 'current_stock', 'reorder_point')
            
            for product in all_products:
                if product.needs_reorder == needs_reorder_bool:
                    products_ids.append(product.id)
            
            queryset = queryset.filter(id__in=products_ids)
            print(f"  ✅ Filtrado por needs_reorder: {needs_reorder_bool} ({len(products_ids)} productos)")
        
        final_count = queryset.count()
        print(f"  📊 Total productos después de filtros: {final_count}")
        
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
            
            # CORRECCIÓN: Manejar usuario para movimientos de stock
            user_for_movement = request.user if request.user.is_authenticated else None
            if not user_for_movement:
                from django.contrib.auth.models import User
                user_for_movement = User.objects.filter(is_superuser=True).first()
                
                if not user_for_movement:
                    user_for_movement, created = User.objects.get_or_create(
                        username='admin',
                        defaults={
                            'email': 'admin@minimarket.com',
                            'first_name': 'Admin',
                            'last_name': 'Sistema',
                            'is_superuser': True,
                            'is_staff': True
                        }
                    )
                    if created:
                        user_for_movement.set_password('admin123')
                        user_for_movement.save()
            
            StockMovement.objects.create(
                product=product,
                movement_type=movement_type,
                reason=movement_reason,
                quantity=quantity,
                stock_before=stock_before,
                stock_after=product.current_stock,
                notes=reason,
                user=user_for_movement
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