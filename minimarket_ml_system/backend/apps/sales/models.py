from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from apps.products.models import Product

class Customer(models.Model):
    """Modelo para clientes"""
    CUSTOMER_TYPES = [
        ('REGULAR', 'Cliente Regular'),
        ('FREQUENT', 'Cliente Frecuente'),
        ('VIP', 'Cliente VIP'),
        ('WHOLESALE', 'Mayorista'),
    ]
    
    # Información básica
    first_name = models.CharField(max_length=100, verbose_name="Nombres")
    last_name = models.CharField(max_length=100, verbose_name="Apellidos")
    document_type = models.CharField(max_length=10, choices=[('DNI', 'DNI'), ('RUC', 'RUC'), ('CE', 'CE')], default='DNI', verbose_name="Tipo de documento")
    document_number = models.CharField(max_length=20, unique=True, verbose_name="Número de documento")
    
    # Contacto
    phone = models.CharField(max_length=20, blank=True, verbose_name="Teléfono")
    email = models.EmailField(blank=True, verbose_name="Email")
    address = models.TextField(blank=True, verbose_name="Dirección")
    
    # Información comercial
    customer_type = models.CharField(max_length=20, choices=CUSTOMER_TYPES, default='REGULAR', verbose_name="Tipo de cliente")
    credit_limit = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)], verbose_name="Límite de crédito")
    current_debt = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)], verbose_name="Deuda actual")
    
    # Estadísticas
    total_purchases = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Total de compras")
    purchase_count = models.IntegerField(default=0, verbose_name="Cantidad de compras")
    last_purchase_date = models.DateTimeField(null=True, blank=True, verbose_name="Última compra")
    
    # Estado y fechas
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    birth_date = models.DateField(null=True, blank=True, verbose_name="Fecha de nacimiento")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de registro")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Fecha de actualización")
    
    class Meta:
        verbose_name = "Cliente"
        verbose_name_plural = "Clientes"
        ordering = ['last_name', 'first_name']
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.document_number}"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    @property
    def available_credit(self):
        return self.credit_limit - self.current_debt
    
    @property
    def average_purchase(self):
        if self.purchase_count > 0:
            return self.total_purchases / self.purchase_count
        return 0

class Sale(models.Model):
    """Modelo principal de ventas"""
    PAYMENT_METHODS = [
        ('CASH', 'Efectivo'),
        ('CARD', 'Tarjeta'),
        ('TRANSFER', 'Transferencia'),
        ('CREDIT', 'Crédito'),
        ('YAPE', 'Yape'),
        ('PLIN', 'Plin'),
    ]
    
    STATUS_CHOICES = [
        ('PENDING', 'Pendiente'),
        ('COMPLETED', 'Completada'),
        ('CANCELLED', 'Cancelada'),
        ('REFUNDED', 'Devuelta'),
    ]
    
    # Información básica
    sale_number = models.CharField(max_length=50, unique=True, verbose_name="Número de venta")
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Cliente")
    seller = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name="Vendedor")
    
    # Información de pago
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS, verbose_name="Método de pago")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='COMPLETED', verbose_name="Estado")
    
    # Montos
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Subtotal")
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0, validators=[MinValueValidator(0), MaxValueValidator(100)], verbose_name="Descuento %")
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Monto descuento")
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="IGV")
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Total")
    
    # Información adicional
    notes = models.TextField(blank=True, verbose_name="Notas")
    invoice_number = models.CharField(max_length=50, blank=True, verbose_name="Número de factura")
    
    # Fechas
    sale_date = models.DateTimeField(default=timezone.now, verbose_name="Fecha de venta")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Fecha de actualización")
    
    class Meta:
        verbose_name = "Venta"
        verbose_name_plural = "Ventas"
        ordering = ['-sale_date']
        indexes = [
            models.Index(fields=['sale_date']),
            models.Index(fields=['customer']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.sale_number} - {self.total}"
    
    def calculate_totals(self):
        """Calcula los totales de la venta basado en sus items"""
        from decimal import Decimal
        
        items = self.items.all()
        self.subtotal = sum(item.total_price for item in items)
        
        # Calcular descuento
        if self.discount_percentage > 0:
            self.discount_amount = self.subtotal * (self.discount_percentage / Decimal('100'))
        
        # Calcular IGV (18%)
        subtotal_with_discount = self.subtotal - self.discount_amount
        self.tax = subtotal_with_discount * Decimal('0.18')
        
        # Total final
        self.total = subtotal_with_discount + self.tax
        
        return self.total

class SaleItem(models.Model):
    """Modelo para items de venta"""
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items', verbose_name="Venta")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, verbose_name="Producto")
    
    # Cantidades y precios
    quantity = models.IntegerField(validators=[MinValueValidator(1)], verbose_name="Cantidad")
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Precio unitario")
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0, validators=[MinValueValidator(0), MaxValueValidator(100)], verbose_name="Descuento %")
    total_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Precio total")
    
    # Costos (para análisis de rentabilidad)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Costo unitario")
    total_cost = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Costo total")
    profit = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Ganancia")
    
    # Información adicional
    notes = models.CharField(max_length=200, blank=True, verbose_name="Notas")
    
    class Meta:
        verbose_name = "Item de venta"
        verbose_name_plural = "Items de venta"
    
    def __str__(self):
        return f"{self.product.name} x {self.quantity}"
    
    def save(self, *args, **kwargs):
        from decimal import Decimal
        
        # Calcular precio total con descuento
        price_before_discount = self.unit_price * self.quantity
        discount_amount = price_before_discount * (self.discount_percentage / Decimal('100'))
        self.total_price = price_before_discount - discount_amount
        
        # Calcular costos y ganancia
        self.unit_cost = self.product.cost_price
        self.total_cost = self.unit_cost * self.quantity
        self.profit = self.total_price - self.total_cost
        
        super().save(*args, **kwargs)

class DailySummary(models.Model):
    """Modelo para resumen diario de ventas"""
    date = models.DateField(unique=True, verbose_name="Fecha")
    
    # Ventas
    total_sales = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Total ventas")
    sale_count = models.IntegerField(default=0, verbose_name="Cantidad de ventas")
    
    # Productos
    products_sold = models.IntegerField(default=0, verbose_name="Productos vendidos")
    unique_products = models.IntegerField(default=0, verbose_name="Productos únicos")
    
    # Métodos de pago
    cash_sales = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Ventas en efectivo")
    card_sales = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Ventas con tarjeta")
    transfer_sales = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Ventas por transferencia")
    credit_sales = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Ventas a crédito")
    digital_wallet_sales = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Ventas por billetera digital")
    
    # Rentabilidad
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Costo total")
    total_profit = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Ganancia total")
    profit_margin = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name="Margen de ganancia %")
    
    # Promedios
    average_sale = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Venta promedio")
    average_items_per_sale = models.DecimalField(max_digits=5, decimal_places=2, default=0, verbose_name="Items promedio por venta")
    
    # Clientes
    unique_customers = models.IntegerField(default=0, verbose_name="Clientes únicos")
    new_customers = models.IntegerField(default=0, verbose_name="Clientes nuevos")
    
    # Horarios pico (para análisis)
    peak_hour = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(0), MaxValueValidator(23)], verbose_name="Hora pico")
    peak_hour_sales = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="Ventas hora pico")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Fecha de actualización")
    
    class Meta:
        verbose_name = "Resumen diario"
        verbose_name_plural = "Resúmenes diarios"
        ordering = ['-date']
    
    def __str__(self):
        return f"Resumen {self.date} - S/. {self.total_sales}"
    
    def calculate_summary(self):
        """Calcula el resumen basado en las ventas del día"""
        from django.db.models import Sum, Count, Avg
        
        sales = Sale.objects.filter(
            sale_date__date=self.date,
            status='COMPLETED'
        )
        
        if sales.exists():
            # Totales
            self.total_sales = sales.aggregate(Sum('total'))['total__sum'] or 0
            self.sale_count = sales.count()
            
            # Calcular otros métricas
            self.average_sale = self.total_sales / self.sale_count if self.sale_count > 0 else 0
            
            # Por método de pago
            self.cash_sales = sales.filter(payment_method='CASH').aggregate(Sum('total'))['total__sum'] or 0
            self.card_sales = sales.filter(payment_method='CARD').aggregate(Sum('total'))['total__sum'] or 0
            self.transfer_sales = sales.filter(payment_method='TRANSFER').aggregate(Sum('total'))['total__sum'] or 0
            self.credit_sales = sales.filter(payment_method='CREDIT').aggregate(Sum('total'))['total__sum'] or 0
            self.digital_wallet_sales = sales.filter(payment_method__in=['YAPE', 'PLIN']).aggregate(Sum('total'))['total__sum'] or 0
            
            # Calcular rentabilidad
            sale_items = SaleItem.objects.filter(sale__in=sales)
            self.total_cost = sale_items.aggregate(Sum('total_cost'))['total_cost__sum'] or 0
            self.total_profit = sale_items.aggregate(Sum('profit'))['profit__sum'] or 0
            
            if self.total_sales > 0:
                self.profit_margin = (self.total_profit / self.total_sales) * 100
            
            # Productos vendidos
            self.products_sold = sale_items.aggregate(Sum('quantity'))['quantity__sum'] or 0
            self.unique_products = sale_items.values('product').distinct().count()
            
            # Items promedio por venta
            self.average_items_per_sale = sale_items.count() / self.sale_count if self.sale_count > 0 else 0
            
            # Clientes únicos
            self.unique_customers = sales.exclude(customer=None).values('customer').distinct().count()
            
            # Hora pico (la hora con más ventas)
            from django.db.models.functions import ExtractHour
            peak_hour_data = sales.annotate(
                hour=ExtractHour('sale_date')
            ).values('hour').annotate(
                total=Sum('total')
            ).order_by('-total').first()
            
            if peak_hour_data:
                self.peak_hour = peak_hour_data['hour']
                self.peak_hour_sales = peak_hour_data['total']