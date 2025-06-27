# Archivo: minimarket_ml_system/backend/apps/inventory/views.py

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Sum, Count
from datetime import datetime, timedelta

from .models import StockMovement, PurchaseOrder, PurchaseOrderItem, InventoryCount, InventoryCountItem
from .serializers import (
    StockMovementSerializer, PurchaseOrderSerializer, PurchaseOrderItemSerializer,
    InventoryCountSerializer, InventoryCountItemSerializer, StockAdjustmentSerializer,
    LowStockReportSerializer
)
from apps.products.models import Product

class StockMovementViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para movimientos de stock"""
    queryset = StockMovement.objects.all()
    serializer_class = StockMovementSerializer
    permission_classes = []
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtros opcionales
        product = self.request.query_params.get('product')
        movement_type = self.request.query_params.get('movement_type')
        reason = self.request.query_params.get('reason')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if product:
            queryset = queryset.filter(product_id=product)
        
        if movement_type:
            queryset = queryset.filter(movement_type=movement_type)
        
        if reason:
            queryset = queryset.filter(reason=reason)
        
        if date_from:
            queryset = queryset.filter(movement_date__date__gte=date_from)
        
        if date_to:
            queryset = queryset.filter(movement_date__date__lte=date_to)
        
        return queryset.order_by('-movement_date')
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Resumen de movimientos de stock"""
        days = int(request.query_params.get('days', 30))
        start_date = datetime.now() - timedelta(days=days)
        
        movements = StockMovement.objects.filter(movement_date__gte=start_date)
        
        # Movimientos por tipo
        by_type = movements.values('movement_type').annotate(
            count=Count('id'),
            total_quantity=Sum('quantity')
        ).order_by('-count')
        
        # Movimientos por razón
        by_reason = movements.values('reason').annotate(
            count=Count('id'),
            total_quantity=Sum('quantity')
        ).order_by('-count')
        
        return Response({
            'period_days': days,
            'total_movements': movements.count(),
            'by_type': list(by_type),
            'by_reason': list(by_reason)
        })

class PurchaseOrderViewSet(viewsets.ModelViewSet):
    """ViewSet para órdenes de compra"""
    queryset = PurchaseOrder.objects.all()
    serializer_class = PurchaseOrderSerializer
    permission_classes = []
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtros opcionales
        supplier = self.request.query_params.get('supplier')
        status_filter = self.request.query_params.get('status')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        if supplier:
            queryset = queryset.filter(supplier_id=supplier)
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        if date_from:
            queryset = queryset.filter(order_date__date__gte=date_from)
        
        if date_to:
            queryset = queryset.filter(order_date__date__lte=date_to)
        
        return queryset.order_by('-order_date')
    
    def perform_create(self, serializer):
        # Generar número de orden
        last_order = PurchaseOrder.objects.order_by('-id').first()
        if last_order:
            order_number = f"PO{str(int(last_order.order_number[2:]) + 1).zfill(6)}"
        else:
            order_number = "PO000001"
        
        # CORRECCIÓN: Verificar si hay usuario autenticado
        created_by = None
        if hasattr(self.request, 'user') and self.request.user.is_authenticated:
            created_by = self.request.user
        else:
            # Si no hay usuario autenticado, usar el primer superusuario disponible
            from django.contrib.auth.models import User
            created_by = User.objects.filter(is_superuser=True).first()
            
            # Si no hay superusuarios, crear un usuario por defecto
            if not created_by:
                created_by, created = User.objects.get_or_create(
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
                    created_by.set_password('admin123')
                    created_by.save()
        
        serializer.save(
            order_number=order_number,
            created_by=created_by
        )
    
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Aprobar orden de compra"""
        order = self.get_object()
        
        if order.status != 'PENDING':
            return Response(
                {'error': 'Solo se pueden aprobar órdenes pendientes'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        order.status = 'APPROVED'
        order.approved_by = request.user
        order.save()
        
        return Response({
            'success': True,
            'message': f'Orden {order.order_number} aprobada exitosamente'
        })
    
    @action(detail=True, methods=['post'])
    def receive(self, request, pk=None):
        """Recibir productos de la orden"""
        order = self.get_object()
        
        if order.status not in ['APPROVED', 'ORDERED', 'PARTIAL']:
            return Response(
                {'error': 'La orden debe estar aprobada para recibir productos'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        items_data = request.data.get('items', [])
        
        for item_data in items_data:
            try:
                item = order.items.get(id=item_data['item_id'])
                received_quantity = int(item_data['received_quantity'])
                
                if received_quantity > (item.quantity_ordered - item.quantity_received):
                    continue
                
                # Actualizar item
                item.quantity_received += received_quantity
                if item.quantity_received >= item.quantity_ordered:
                    item.is_received = True
                    item.received_date = datetime.now()
                item.save()
                
                # Actualizar stock del producto
                product = item.product
                stock_before = product.current_stock
                product.current_stock += received_quantity
                product.save()
                
                # Crear movimiento de stock
                StockMovement.objects.create(
                    product=product,
                    movement_type='IN',
                    reason='PURCHASE',
                    quantity=received_quantity,
                    stock_before=stock_before,
                    stock_after=product.current_stock,
                    unit_cost=item.unit_price,
                    total_cost=item.unit_price * received_quantity,
                    reference_document=order.order_number,
                    user=request.user
                )
                
            except (PurchaseOrderItem.DoesNotExist, ValueError, KeyError):
                continue
        
        # Actualizar estado de la orden
        total_items = order.items.count()
        received_items = order.items.filter(is_received=True).count()
        
        if received_items == total_items:
            order.status = 'RECEIVED'
            order.received_date = datetime.now()
        elif received_items > 0:
            order.status = 'PARTIAL'
        
        order.save()
        
        return Response({
            'success': True,
            'message': 'Productos recibidos exitosamente',
            'order_status': order.status
        })

class InventoryCountViewSet(viewsets.ModelViewSet):
    """ViewSet para conteos de inventario"""
    queryset = InventoryCount.objects.all()
    serializer_class = InventoryCountSerializer
    permission_classes = []
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtros opcionales
        status_filter = self.request.query_params.get('status')
        responsible = self.request.query_params.get('responsible')
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        if responsible:
            queryset = queryset.filter(responsible_id=responsible)
        
        return queryset.order_by('-scheduled_date')
    
    def perform_create(self, serializer):
        # Generar número de orden
        last_order = PurchaseOrder.objects.order_by('-id').first()
        if last_order:
            order_number = f"PO{str(int(last_order.order_number[2:]) + 1).zfill(6)}"
        else:
            order_number = "PO000001"
        
        # CORRECCIÓN: Verificar si hay usuario autenticado
        created_by = None
        if hasattr(self.request, 'user') and self.request.user.is_authenticated:
            created_by = self.request.user
        else:
            # Si no hay usuario autenticado, usar el primer superusuario disponible
            from django.contrib.auth.models import User
            created_by = User.objects.filter(is_superuser=True).first()
            
            # Si no hay superusuarios, crear un usuario por defecto
            if not created_by:
                created_by, created = User.objects.get_or_create(
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
                    created_by.set_password('admin123')
                    created_by.save()
        
        serializer.save(
            order_number=order_number,
            created_by=created_by
        )
    
    @action(detail=True, methods=['post'])
    def start_count(self, request, pk=None):
        """Iniciar conteo de inventario"""
        count = self.get_object()
        
        if count.status != 'PLANNED':
            return Response(
                {'error': 'Solo se pueden iniciar conteos planificados'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Crear items de conteo para todos los productos activos
        products = Product.objects.filter(is_active=True)
        
        for product in products:
            InventoryCountItem.objects.create(
                inventory_count=count,
                product=product,
                system_quantity=product.current_stock
            )
        
        count.status = 'IN_PROGRESS'
        count.start_date = datetime.now()
        count.save()
        
        return Response({
            'success': True,
            'message': f'Conteo {count.count_number} iniciado con {products.count()} productos',
            'items_count': products.count()
        })
    
    @action(detail=True, methods=['post'])
    def complete_count(self, request, pk=None):
        """Completar conteo y ajustar inventario"""
        count = self.get_object()
        
        if count.status != 'IN_PROGRESS':
            return Response(
                {'error': 'El conteo debe estar en progreso'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        adjustments_made = 0
        
        # Procesar diferencias
        for item in count.items.all():
            if item.counted_quantity is not None and item.difference != 0:
                product = item.product
                stock_before = product.current_stock
                product.current_stock = item.counted_quantity
                product.save()
                
                # Crear movimiento de stock
                if item.difference > 0:
                    movement_type = 'IN'
                    quantity = item.difference
                else:
                    movement_type = 'OUT'
                    quantity = abs(item.difference)
                
                StockMovement.objects.create(
                    product=product,
                    movement_type=movement_type,
                    reason='INVENTORY_ADJUST',
                    quantity=quantity,
                    stock_before=stock_before,
                    stock_after=product.current_stock,
                    notes=f'Ajuste por conteo {count.count_number}',
                    reference_document=count.count_number,
                    user=request.user
                )
                
                adjustments_made += 1
        
        count.status = 'COMPLETED'
        count.end_date = datetime.now()
        count.save()
        
        return Response({
            'success': True,
            'message': f'Conteo completado con {adjustments_made} ajustes',
            'adjustments_made': adjustments_made
        })

class InventoryReportsViewSet(viewsets.ViewSet):
    """ViewSet para reportes de inventario"""
    permission_classes = []
    
    def list(self, request):
        """Lista de reportes disponibles"""
        return Response({
            'available_reports': [
                'low_stock',
                'stock_movements',
                'abc_analysis',
                'expiring_products'
            ]
        })
    
    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Reporte de productos con stock bajo"""
        products_data = []
        
        for product in Product.objects.filter(is_active=True):
            if product.needs_reorder or product.stock_status in ['SIN_STOCK', 'STOCK_BAJO']:
                # Calcular días de stock disponible
                from apps.sales.models import SaleItem
                from django.db.models import Avg
                
                avg_daily_sales = SaleItem.objects.filter(
                    product=product,
                    sale__sale_date__gte=datetime.now() - timedelta(days=30),
                    sale__status='COMPLETED'
                ).aggregate(
                    avg_daily=Avg('quantity')
                )['avg_daily'] or 0
                
                days_of_stock = product.current_stock / avg_daily_sales if avg_daily_sales > 0 else float('inf')
                suggested_order = max(0, product.max_stock - product.current_stock)
                
                products_data.append({
                    'product_id': product.id,
                    'product_code': product.code,
                    'product_name': product.name,
                    'category_name': product.category.name,
                    'current_stock': product.current_stock,
                    'min_stock': product.min_stock,
                    'reorder_point': product.reorder_point,
                    'stock_status': product.stock_status,
                    'days_of_stock': round(days_of_stock, 2) if days_of_stock != float('inf') else None,
                    'suggested_order': suggested_order
                })
        
        # Ordenar por prioridad (menos días de stock primero)
        products_data.sort(key=lambda x: x['days_of_stock'] or 0)
        
        serializer = LowStockReportSerializer(products_data, many=True)
        return Response({
            'report_type': 'low_stock',
            'generated_at': datetime.now(),
            'products_count': len(products_data),
            'products': serializer.data
        })
    
    @action(detail=False, methods=['post'])
    def bulk_adjust_stock(self, request):
        """Ajuste masivo de stock"""
        adjustments = request.data.get('adjustments', [])
        
        if not adjustments:
            return Response(
                {'error': 'Se requiere al menos un ajuste'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        successful_adjustments = 0
        errors = []
        
        for adjustment_data in adjustments:
            serializer = StockAdjustmentSerializer(data=adjustment_data)
            
            if serializer.is_valid():
                try:
                    product = Product.objects.get(id=serializer.validated_data['product'])
                    new_quantity = serializer.validated_data['new_quantity']
                    reason = serializer.validated_data['reason']
                    notes = serializer.validated_data.get('notes', '')
                    
                    stock_before = product.current_stock
                    difference = new_quantity - stock_before
                    
                    if difference != 0:
                        product.current_stock = new_quantity
                        product.save()
                        
                        # Crear movimiento
                        movement_type = 'IN' if difference > 0 else 'OUT'
                        quantity = abs(difference)
                        
                        StockMovement.objects.create(
                            product=product,
                            movement_type=movement_type,
                            reason='INVENTORY_ADJUST',
                            quantity=quantity,
                            stock_before=stock_before,
                            stock_after=new_quantity,
                            notes=f'{reason}. {notes}',
                            user=request.user
                        )
                        
                        successful_adjustments += 1
                    
                except Product.DoesNotExist:
                    errors.append(f'Producto {adjustment_data.get("product")} no encontrado')
                except Exception as e:
                    errors.append(f'Error ajustando producto {adjustment_data.get("product")}: {str(e)}')
            else:
                errors.append(f'Datos inválidos: {serializer.errors}')
        
        return Response({
            'success': True,
            'successful_adjustments': successful_adjustments,
            'total_requested': len(adjustments),
            'errors': errors
        })