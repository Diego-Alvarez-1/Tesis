from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone

class Category(models.Model):
    """Modelo para categorías de productos"""
    name = models.CharField(max_length=100, unique=True, verbose_name="Nombre")
    description = models.TextField(blank=True, null=True, verbose_name="Descripción")
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Fecha de actualización")
    
    class Meta:
        verbose_name = "Categoría"
        verbose_name_plural = "Categorías"
        ordering = ['name']
    
    def __str__(self):
        return self.name

class Supplier(models.Model):
    """Modelo para proveedores"""
    name = models.CharField(max_length=200, verbose_name="Nombre")
    ruc = models.CharField(max_length=11, unique=True, verbose_name="RUC")
    phone = models.CharField(max_length=20, blank=True, verbose_name="Teléfono")
    email = models.EmailField(blank=True, verbose_name="Email")
    address = models.TextField(blank=True, verbose_name="Dirección")
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Fecha de actualización")
    
    class Meta:
        verbose_name = "Proveedor"
        verbose_name_plural = "Proveedores"
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} - {self.ruc}"

class Product(models.Model):
    """Modelo principal de productos"""
    # Información básica
    code = models.CharField(max_length=50, unique=True, verbose_name="Código")
    barcode = models.CharField(max_length=100, unique=True, blank=True, null=True, verbose_name="Código de barras")
    name = models.CharField(max_length=200, verbose_name="Nombre")
    description = models.TextField(blank=True, verbose_name="Descripción")
    
    # Relaciones
    category = models.ForeignKey(Category, on_delete=models.PROTECT, verbose_name="Categoría")
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, verbose_name="Proveedor")
    
    # Precios
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, 
                                   validators=[MinValueValidator(0)], 
                                   verbose_name="Precio de costo")
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, 
                                   validators=[MinValueValidator(0)], 
                                   verbose_name="Precio de venta")
    
    # Control de inventario
    current_stock = models.IntegerField(default=0, validators=[MinValueValidator(0)], 
                                      verbose_name="Stock actual")
    min_stock = models.IntegerField(default=10, validators=[MinValueValidator(0)], 
                                   verbose_name="Stock mínimo")
    max_stock = models.IntegerField(default=100, validators=[MinValueValidator(0)], 
                                   verbose_name="Stock máximo")
    reorder_point = models.IntegerField(default=20, validators=[MinValueValidator(0)], 
                                      verbose_name="Punto de reorden")
    
    # Unidades
    unit = models.CharField(max_length=20, default="UNIDAD", verbose_name="Unidad de medida")
    units_per_box = models.IntegerField(default=1, validators=[MinValueValidator(1)], 
                                      verbose_name="Unidades por caja")
    
    # Información adicional
    brand = models.CharField(max_length=100, blank=True, verbose_name="Marca")
    weight = models.DecimalField(max_digits=8, decimal_places=3, null=True, blank=True, 
                               verbose_name="Peso (kg)")
    expiration_days = models.IntegerField(null=True, blank=True, 
                                        verbose_name="Días hasta vencimiento")
    
    # Estado y fechas
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    is_perishable = models.BooleanField(default=False, verbose_name="Es perecedero")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de creación")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Fecha de actualización")
    
    class Meta:
        verbose_name = "Producto"
        verbose_name_plural = "Productos"
        ordering = ['name']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['barcode']),
            models.Index(fields=['category']),
        ]
    
    def __str__(self):
        return f"{self.code} - {self.name}"
    
    @property
    def profit_margin(self):
        """Calcula el margen de ganancia en porcentaje"""
        if self.cost_price > 0:
            return ((self.sale_price - self.cost_price) / self.cost_price) * 100
        return 0
    
    @property
    def stock_status(self):
        """Determina el estado del stock"""
        if self.current_stock <= 0:
            return "SIN_STOCK"
        elif self.current_stock <= self.min_stock:
            return "STOCK_BAJO"
        elif self.current_stock >= self.max_stock:
            return "SOBRESTOCK"
        else:
            return "NORMAL"
    
    @property
    def needs_reorder(self):
        """Indica si el producto necesita reorden"""
        return self.current_stock <= self.reorder_point