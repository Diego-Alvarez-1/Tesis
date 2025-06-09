from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.utils import timezone
from apps.products.models import Product, Supplier

class StockMovement(models.Model):
    """Modelo para movimientos de stock"""
    MOVEMENT_TYPES = [
        ('IN', 'Entrada'),
        ('OUT', 'Salida'),
        ('ADJUST', 'Ajuste'),
        ('RETURN', 'Devolución'),
        ('DAMAGED', 'Producto dañado'),
        ('EXPIRED', 'Producto vencido'),
    ]
    
    MOVEMENT_REASONS = [
        ('PURCHASE', 'Compra'),
        ('SALE', 'Venta'),
        ('RETURN_SUPPLIER', 'Devolución a proveedor'),
        ('RETURN_CUSTOMER', 'Devolución de cliente'),
        ('INVENTORY_ADJUST', 'Ajuste de inventario'),
        ('DAMAGED_PRODUCT', 'Producto dañado'),
        ('EXPIRED_PRODUCT', 'Producto vencido'),
        ('INITIAL_STOCK', 'Stock inicial'),
    ]
    
    # Relaciones
    product = models.ForeignKey(Product, on_delete=models.CASCADE, verbose_name="Producto")
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name="Usuario")
    
    # Información del movimiento
    movement_type = models.CharField(max_length=10, choices=MOVEMENT_TYPES, verbose_name="Tipo de movimiento")
    reason = models.CharField(max_length=20, choices=MOVEMENT_REASONS, verbose_name="Razón")
    quantity = models.IntegerField(validators=[MinValueValidator(1)], verbose_name="Cantidad")
    
    # Stock antes y después
    stock_before = models.IntegerField(verbose_name="Stock antes")
    stock_after = models.IntegerField(verbose_name="Stock después")
    
    # Información adicional
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, verbose_name="Costo unitario")
    total_cost = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, verbose_name="Costo total")
    notes = models.TextField(blank=True, verbose_name="Notas")
    
    # Referencia a documento
    reference_document = models.CharField(max_length=100, blank=True, verbose_name="Documento de referencia")
    
    # Fechas
    movement_date = models.DateTimeField(default=timezone.now, verbose_name="Fecha de movimiento")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")
    
    class Meta:
        verbose_name = "Movimiento de stock"
        verbose_name_plural = "Movimientos de stock"
        ordering = ['-movement_date']
        indexes = [
            models.Index(fields=['product', 'movement_date']),
            models.Index(fields=['movement_type']),
        ]
    
    def __str__(self):
        return f"{self.product.name} - {self.get_movement_type_display()} - {self.quantity}"
    
    def save(self, *args, **kwargs):
        # Calcular costo total si no está establecido
        if self.unit_cost and not self.total_cost:
            self.total_cost = self.unit_cost * self.quantity
        super().save(*args, **kwargs)

class PurchaseOrder(models.Model):
    """Modelo para órdenes de compra"""
    STATUS_CHOICES = [
        ('DRAFT', 'Borrador'),
        ('PENDING', 'Pendiente'),
        ('APPROVED', 'Aprobada'),
        ('ORDERED', 'Ordenada'),
        ('PARTIAL', 'Recibida parcialmente'),
        ('RECEIVED', 'Recibida'),
        ('CANCELLED', 'Cancelada'),
    ]
    
    # Información básica
    order_number = models.CharField(max_length=50, unique=True, verbose_name="Número de orden")
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, verbose_name="Proveedor")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT', verbose_name="Estado")
    
    # Fechas
    order_date = models.DateTimeField(default=timezone.now, verbose_name="Fecha de orden")
    expected_date = models.DateField(null=True, blank=True, verbose_name="Fecha esperada")
    received_date = models.DateTimeField(null=True, blank=True, verbose_name="Fecha de recepción")
    
    # Totales
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Subtotal")
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name="IGV")
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0, verbose_name="Total")
    
    # Información adicional
    notes = models.TextField(blank=True, verbose_name="Notas")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='purchase_orders_created', verbose_name="Creado por")
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='purchase_orders_approved', verbose_name="Aprobado por")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Fecha de actualización")
    
    class Meta:
        verbose_name = "Orden de compra"
        verbose_name_plural = "Órdenes de compra"
        ordering = ['-order_date']
    
    def __str__(self):
        return f"{self.order_number} - {self.supplier.name}"

class PurchaseOrderItem(models.Model):
    """Modelo para items de órdenes de compra"""
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items', verbose_name="Orden de compra")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, verbose_name="Producto")
    
    # Cantidades
    quantity_ordered = models.IntegerField(validators=[MinValueValidator(1)], verbose_name="Cantidad ordenada")
    quantity_received = models.IntegerField(default=0, validators=[MinValueValidator(0)], verbose_name="Cantidad recibida")
    
    # Precios
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Precio unitario")
    total_price = models.DecimalField(max_digits=12, decimal_places=2, verbose_name="Precio total")
    
    # Estado
    is_received = models.BooleanField(default=False, verbose_name="Recibido")
    received_date = models.DateTimeField(null=True, blank=True, verbose_name="Fecha de recepción")
    
    class Meta:
        verbose_name = "Item de orden de compra"
        verbose_name_plural = "Items de órdenes de compra"
        unique_together = ['purchase_order', 'product']
    
    def __str__(self):
        return f"{self.product.name} - {self.quantity_ordered} unidades"
    
    def save(self, *args, **kwargs):
        # Calcular precio total
        self.total_price = self.unit_price * self.quantity_ordered
        # Marcar como recibido si la cantidad recibida es igual a la ordenada
        if self.quantity_received >= self.quantity_ordered:
            self.is_received = True
        super().save(*args, **kwargs)

class InventoryCount(models.Model):
    """Modelo para conteos de inventario"""
    STATUS_CHOICES = [
        ('PLANNED', 'Planificado'),
        ('IN_PROGRESS', 'En progreso'),
        ('COMPLETED', 'Completado'),
        ('CANCELLED', 'Cancelado'),
    ]
    
    # Información básica
    count_number = models.CharField(max_length=50, unique=True, verbose_name="Número de conteo")
    description = models.CharField(max_length=200, verbose_name="Descripción")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PLANNED', verbose_name="Estado")
    
    # Fechas
    scheduled_date = models.DateField(verbose_name="Fecha programada")
    start_date = models.DateTimeField(null=True, blank=True, verbose_name="Fecha de inicio")
    end_date = models.DateTimeField(null=True, blank=True, verbose_name="Fecha de fin")
    
    # Personal
    responsible = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='inventory_counts_responsible', verbose_name="Responsable")
    participants = models.ManyToManyField(User, related_name='inventory_counts_participated', blank=True, verbose_name="Participantes")
    
    # Información adicional
    notes = models.TextField(blank=True, verbose_name="Notas")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Fecha de actualización")
    
    class Meta:
        verbose_name = "Conteo de inventario"
        verbose_name_plural = "Conteos de inventario"
        ordering = ['-scheduled_date']
    
    def __str__(self):
        return f"{self.count_number} - {self.description}"

class InventoryCountItem(models.Model):
    """Modelo para items de conteo de inventario"""
    inventory_count = models.ForeignKey(InventoryCount, on_delete=models.CASCADE, related_name='items', verbose_name="Conteo de inventario")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, verbose_name="Producto")
    
    # Cantidades
    system_quantity = models.IntegerField(verbose_name="Cantidad en sistema")
    counted_quantity = models.IntegerField(null=True, blank=True, verbose_name="Cantidad contada")
    difference = models.IntegerField(default=0, verbose_name="Diferencia")
    
    # Información adicional
    notes = models.TextField(blank=True, verbose_name="Observaciones")
    counted_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, verbose_name="Contado por")
    counted_at = models.DateTimeField(null=True, blank=True, verbose_name="Fecha de conteo")
    
    class Meta:
        verbose_name = "Item de conteo"
        verbose_name_plural = "Items de conteo"
        unique_together = ['inventory_count', 'product']
    
    def __str__(self):
        return f"{self.product.name} - Sistema: {self.system_quantity}, Contado: {self.counted_quantity}"
    
    def save(self, *args, **kwargs):
        # Calcular diferencia
        if self.counted_quantity is not None:
            self.difference = self.counted_quantity - self.system_quantity
        super().save(*args, **kwargs)