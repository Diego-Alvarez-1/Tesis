# Archivo: minimarket_ml_system/backend/apps/sales/views.py

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Sum, Count, Avg
from django.db.models.functions import TruncDate, TruncMonth
from datetime import datetime, timedelta

from .models import Customer, Sale, SaleItem, DailySummary
from .serializers import (
    CustomerSerializer, SaleSerializer, SaleCreateSerializer,
    SaleItemSerializer, DailySummarySerializer, SaleSummarySerializer
)

class CustomerViewSet(viewsets.ModelViewSet):
    """ViewSet para clientes"""
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = []
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtros opcionales
        customer_type = self.request.query_params.get('customer_type')
        is_active = self.request.query_params.get('is_active')
        search = self.request.query_params.get('search')
        has_credit = self.request.query_params.get('has_credit')
        
        print(f"🔍 Filtros de clientes recibidos:")
        print(f"  - customer_type: {customer_type}")
        print(f"  - is_active: {is_active}")
        print(f"  - search: {search}")
        print(f"  - has_credit: {has_credit}")
        
        # FILTRO POR TIPO DE CLIENTE
        if customer_type and customer_type.strip() and customer_type.lower() not in ['todos', 'all', '']:
            queryset = queryset.filter(customer_type=customer_type)
            print(f"  ✅ Filtrado por customer_type: {customer_type}")
        
        # FILTRO POR ESTADO ACTIVO
        if is_active and is_active.strip() and is_active.lower() not in ['todos', 'all', '']:
            is_active_bool = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active_bool)
            print(f"  ✅ Filtrado por is_active: {is_active_bool}")
        else:
            print(f"  ➡️ Sin filtro is_active (mostrando todos los clientes)")
        
        # FILTRO POR CRÉDITO
        if has_credit and has_credit.strip() and has_credit.lower() not in ['todos', 'all', '']:
            if has_credit.lower() == 'true':
                queryset = queryset.filter(credit_limit__gt=0)
            else:
                queryset = queryset.filter(credit_limit=0)
            print(f"  ✅ Filtrado por has_credit: {has_credit}")
        
        # FILTRO POR BÚSQUEDA
        if search and search.strip():
            search_term = search.strip()
            queryset = queryset.filter(
                Q(first_name__icontains=search_term) |
                Q(last_name__icontains=search_term) |
                Q(document_number__icontains=search_term) |
                Q(email__icontains=search_term) |
                Q(phone__icontains=search_term)
            )
            print(f"  ✅ Filtrado por búsqueda: '{search_term}'")
        
        final_count = queryset.count()
        print(f"  📊 Total clientes después de filtros: {final_count}")
        
        return queryset.order_by('last_name', 'first_name')
    
    @action(detail=True, methods=['get'])
    def sales_history(self, request, pk=None):
        """Historial de ventas del cliente"""
        customer = self.get_object()
        days = int(request.query_params.get('days', 90))
        
        start_date = datetime.now() - timedelta(days=days)
        sales = Sale.objects.filter(
            customer=customer,
            sale_date__gte=start_date,
            status='COMPLETED'
        ).order_by('-sale_date')
        
        serializer = SaleSummarySerializer(sales, many=True)
        
        return Response({
            'customer': CustomerSerializer(customer).data,
            'period_days': days,
            'sales_count': sales.count(),
            'total_spent': sales.aggregate(total=Sum('total'))['total'] or 0,
            'sales': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def top_customers(self, request):
        """Clientes con más compras"""
        limit = int(request.query_params.get('limit', 10))
        
        customers = Customer.objects.filter(
            is_active=True,
            purchase_count__gt=0
        ).order_by('-total_purchases')[:limit]
        
        serializer = CustomerSerializer(customers, many=True)
        return Response(serializer.data)

class SaleViewSet(viewsets.ModelViewSet):
    """ViewSet para ventas"""
    queryset = Sale.objects.all()
    permission_classes = []
    
    def get_serializer_class(self):
        if self.action == 'create':
            return SaleCreateSerializer
        return SaleSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtros opcionales
        customer = self.request.query_params.get('customer')
        payment_method = self.request.query_params.get('payment_method')
        status_filter = self.request.query_params.get('status')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        search = self.request.query_params.get('search')
        
        if customer:
            queryset = queryset.filter(customer_id=customer)
        
        if payment_method:
            queryset = queryset.filter(payment_method=payment_method)
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        if date_from and date_from.strip():
            try:
                from datetime import datetime
                date_obj = datetime.strptime(date_from, '%Y-%m-%d').date()
                queryset = queryset.filter(sale_date__date__gte=date_obj)
                print(f"  ✅ Filtrado desde: {date_obj}")
            except ValueError:
                print(f"  ❌ Fecha inválida date_from: {date_from}")

        if date_to and date_to.strip():
            try:
                from datetime import datetime
                date_obj = datetime.strptime(date_to, '%Y-%m-%d').date()
                queryset = queryset.filter(sale_date__date__lte=date_obj)
                print(f"  ✅ Filtrado hasta: {date_obj}")
            except ValueError:
                print(f"  ❌ Fecha inválida date_to: {date_to}")
        
        if search:
            queryset = queryset.filter(
                Q(sale_number__icontains=search) |
                Q(customer__first_name__icontains=search) |
                Q(customer__last_name__icontains=search) |
                Q(invoice_number__icontains=search)
            )
        
        return queryset.order_by('-sale_date')
    
    def perform_create(self, serializer):
        # Generar número de venta
        last_sale = Sale.objects.order_by('-id').first()
        if last_sale:
            sale_number = f"V{str(int(last_sale.sale_number[1:]) + 1).zfill(6)}"
        else:
            sale_number = "V000001"
    
    # CORRECCIÓN: Manejar usuario no autenticado
        seller = None
        if hasattr(self.request, 'user') and self.request.user.is_authenticated:
            seller = self.request.user
        else:
            # Usar el primer superusuario disponible o crear uno
            from django.contrib.auth.models import User
            seller = User.objects.filter(is_superuser=True).first()
            
            if not seller:
                # Crear usuario admin por defecto
                seller, created = User.objects.get_or_create(
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
                    seller.set_password('admin123')
                    seller.save()
                    print(f"✅ Usuario admin creado: {seller.username}")
        
        print(f"🔍 Creando venta con seller: {seller}")
        
        serializer.save(
            sale_number=sale_number,
            seller=seller
        )
    
    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Estadísticas para dashboard"""
        today = datetime.now().date()
        yesterday = today - timedelta(days=1)
        this_month = today.replace(day=1)
        
        # Ventas de hoy
        today_sales = Sale.objects.filter(
            sale_date__date=today,
            status='COMPLETED'
        ).aggregate(
            count=Count('id'),
            total=Sum('total')
        )
        
        # Ventas de ayer
        yesterday_sales = Sale.objects.filter(
            sale_date__date=yesterday,
            status='COMPLETED'
        ).aggregate(
            count=Count('id'),
            total=Sum('total')
        )
        
        # Ventas del mes
        month_sales = Sale.objects.filter(
            sale_date__date__gte=this_month,
            status='COMPLETED'
        ).aggregate(
            count=Count('id'),
            total=Sum('total')
        )
        
        # Métodos de pago más usados
        payment_methods = Sale.objects.filter(
            sale_date__date__gte=today - timedelta(days=30),
            status='COMPLETED'
        ).values('payment_method').annotate(
            count=Count('id'),
            total=Sum('total')
        ).order_by('-count')
        
        return Response({
            'today': {
                'sales_count': today_sales['count'] or 0,
                'total_amount': float(today_sales['total'] or 0)
            },
            'yesterday': {
                'sales_count': yesterday_sales['count'] or 0,
                'total_amount': float(yesterday_sales['total'] or 0)
            },
            'this_month': {
                'sales_count': month_sales['count'] or 0,
                'total_amount': float(month_sales['total'] or 0)
            },
            'payment_methods': list(payment_methods)
        })
    
    @action(detail=False, methods=['get'])
    def sales_by_period(self, request):
        """Ventas agrupadas por período"""
        period = request.query_params.get('period', 'daily')  # daily, monthly
        days = int(request.query_params.get('days', 30))
        
        start_date = datetime.now() - timedelta(days=days)
        
        if period == 'monthly':
            sales_data = Sale.objects.filter(
                sale_date__gte=start_date,
                status='COMPLETED'
            ).annotate(
                period=TruncMonth('sale_date')
            ).values('period').annotate(
                sales_count=Count('id'),
                total_amount=Sum('total')
            ).order_by('period')
        else:  # daily
            sales_data = Sale.objects.filter(
                sale_date__gte=start_date,
                status='COMPLETED'
            ).annotate(
                period=TruncDate('sale_date')
            ).values('period').annotate(
                sales_count=Count('id'),
                total_amount=Sum('total')
            ).order_by('period')
        
        return Response({
            'period': period,
            'days': days,
            'data': list(sales_data)
        })
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancela una venta"""
        sale = self.get_object()
        
        if sale.status != 'COMPLETED':
            return Response(
                {'error': 'Solo se pueden cancelar ventas completadas'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Cambiar estado
        sale.status = 'CANCELLED'
        sale.save()
        
        # Revertir stock de productos
        for item in sale.items.all():
            product = item.product
            product.current_stock += item.quantity
            product.save()
            
            # CORRECCIÓN: Manejar usuario para movimientos de stock
            user_for_movement = request.user if request.user.is_authenticated else None
            if not user_for_movement:
                from django.contrib.auth.models import User
                user_for_movement = User.objects.filter(is_superuser=True).first()
            
            # Crear movimiento de stock
            from apps.inventory.models import StockMovement
            StockMovement.objects.create(
                product=product,
                movement_type='IN',
                reason='RETURN_CUSTOMER',
                quantity=item.quantity,
                stock_before=product.current_stock - item.quantity,
                stock_after=product.current_stock,
                notes=f'Cancelación de venta {sale.sale_number}',
                user=user_for_movement,
                reference_document=sale.sale_number
            )
        
        return Response({
            'success': True,
            'message': f'Venta {sale.sale_number} cancelada exitosamente'
        })

class DailySummaryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para resúmenes diarios"""
    queryset = DailySummary.objects.all()
    serializer_class = DailySummarySerializer
    permission_classes = []
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtros opcionales
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        
        print(f"🔍 Filtros de resúmenes diarios:")
        print(f"  - date_from: {date_from}")
        print(f"  - date_to: {date_to}")
        
        if date_from and date_from.strip():
            try:
                from datetime import datetime
                date_obj = datetime.strptime(date_from, '%Y-%m-%d').date()
                queryset = queryset.filter(date__gte=date_obj)
                print(f"  ✅ Filtrado desde: {date_obj}")
            except ValueError:
                print(f"  ❌ Fecha inválida date_from: {date_from}")

        if date_to and date_to.strip():
            try:
                from datetime import datetime
                date_obj = datetime.strptime(date_to, '%Y-%m-%d').date()
                queryset = queryset.filter(date__lte=date_obj)
                print(f"  ✅ Filtrado hasta: {date_obj}")
            except ValueError:
                print(f"  ❌ Fecha inválida date_to: {date_to}")
        
        final_count = queryset.count()
        print(f"  📊 Total resúmenes después de filtros: {final_count}")
        
        return queryset.order_by('-date')
    
    @action(detail=False, methods=['get'])
    def trends(self, request):
        """Tendencias de ventas"""
        days = int(request.query_params.get('days', 30))
        
        summaries = DailySummary.objects.filter(
            date__gte=datetime.now().date() - timedelta(days=days)
        ).order_by('date')
        
        if not summaries:
            return Response({
                'message': 'No hay datos disponibles para el período solicitado',
                'days': days
            })
        
        # Calcular tendencias
        total_sales = sum(s.total_sales for s in summaries)
        total_profit = sum(s.total_profit for s in summaries)
        avg_daily_sales = total_sales / len(summaries) if summaries else 0
        avg_profit_margin = sum(s.profit_margin for s in summaries) / len(summaries) if summaries else 0
        
        # Días con mejor y peor rendimiento
        best_day = max(summaries, key=lambda x: x.total_sales)
        worst_day = min(summaries, key=lambda x: x.total_sales)
        
        return Response({
            'period_days': days,
            'summary': {
                'total_sales': float(total_sales),
                'total_profit': float(total_profit),
                'avg_daily_sales': float(avg_daily_sales),
                'avg_profit_margin': float(avg_profit_margin)
            },
            'best_day': {
                'date': best_day.date,
                'sales': float(best_day.total_sales)
            },
            'worst_day': {
                'date': worst_day.date,
                'sales': float(worst_day.total_sales)
            },
            'daily_data': DailySummarySerializer(summaries, many=True).data
        })