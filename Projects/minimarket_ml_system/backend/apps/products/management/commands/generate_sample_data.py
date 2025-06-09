from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import datetime, timedelta
import random
import string
from decimal import Decimal
from apps.products.models import Category, Supplier, Product
from apps.inventory.models import StockMovement, PurchaseOrder, PurchaseOrderItem
from apps.sales.models import Customer, Sale, SaleItem, DailySummary

class Command(BaseCommand):
    help = 'Genera datos de muestra para el sistema (2 años de historia)'

    def handle(self, *args, **kwargs):
        self.stdout.write('Iniciando generación de datos de muestra...')
        
        # Limpiar datos existentes (opcional)
        if input('¿Desea limpiar los datos existentes? (s/n): ').lower() == 's':
            self.clear_existing_data()
        
        # Generar datos
        self.create_categories()
        self.create_suppliers()
        self.create_products()
        self.create_customers()
        self.generate_historical_data()
        
        self.stdout.write(self.style.SUCCESS('Datos de muestra generados exitosamente!'))
    
    def clear_existing_data(self):
        """Limpia los datos existentes"""
        self.stdout.write('Limpiando datos existentes...')
        DailySummary.objects.all().delete()
        SaleItem.objects.all().delete()
        Sale.objects.all().delete()
        Customer.objects.all().delete()
        StockMovement.objects.all().delete()
        PurchaseOrderItem.objects.all().delete()
        PurchaseOrder.objects.all().delete()
        Product.objects.all().delete()
        Supplier.objects.all().delete()
        Category.objects.all().delete()
    
    def create_categories(self):
        """Crea categorías de productos típicas de un minimarket"""
        self.stdout.write('Creando categorías...')
        categories = [
            {'name': 'Abarrotes', 'description': 'Productos de primera necesidad'},
            {'name': 'Bebidas', 'description': 'Gaseosas, jugos, agua, etc.'},
            {'name': 'Lácteos', 'description': 'Leche, yogurt, queso, mantequilla'},
            {'name': 'Panadería', 'description': 'Pan, pasteles, galletas'},
            {'name': 'Carnes y Embutidos', 'description': 'Carnes frescas y procesadas'},
            {'name': 'Frutas y Verduras', 'description': 'Productos frescos'},
            {'name': 'Limpieza', 'description': 'Productos de limpieza del hogar'},
            {'name': 'Cuidado Personal', 'description': 'Higiene y cuidado personal'},
            {'name': 'Snacks', 'description': 'Papitas, galletas, golosinas'},
            {'name': 'Congelados', 'description': 'Productos congelados'},
        ]
        
        for cat_data in categories:
            Category.objects.create(**cat_data)
        
        self.stdout.write(f'✓ {Category.objects.count()} categorías creadas')
    
    def create_suppliers(self):
        """Crea proveedores ficticios"""
        self.stdout.write('Creando proveedores...')
        suppliers = [
            {'name': 'Distribuidora Arequipa SAC', 'ruc': '20100123451'},
            {'name': 'Alimentos del Sur EIRL', 'ruc': '20100123452'},
            {'name': 'Lácteos Misti SA', 'ruc': '20100123453'},
            {'name': 'Bebidas Peruanas SAC', 'ruc': '20100123454'},
            {'name': 'Distribuidora El Sol', 'ruc': '20100123455'},
            {'name': 'Productos Frescos AQP', 'ruc': '20100123456'},
            {'name': 'Limpieza Total SAC', 'ruc': '20100123457'},
            {'name': 'Importadora Sur', 'ruc': '20100123458'},
        ]
        
        for i, supp_data in enumerate(suppliers):
            supp_data.update({
                'phone': f'95{random.randint(1000000, 9999999)}',
                'email': f'ventas@{supp_data["name"].lower().replace(" ", "")[:10]}.com',
                'address': f'Calle {random.choice(["Mercaderes", "San Camilo", "Paucarpata", "Cayma"])} {random.randint(100, 999)}'
            })
            Supplier.objects.create(**supp_data)
        
        self.stdout.write(f'✓ {Supplier.objects.count()} proveedores creados')
    
    def create_products(self):
        """Crea productos típicos de minimarket"""
        self.stdout.write('Creando productos...')
        
        # Obtener categorías y proveedores
        categories = {cat.name: cat for cat in Category.objects.all()}
        suppliers = list(Supplier.objects.all())
        
        # Definir productos por categoría
        products_data = [
            # Abarrotes
            {'name': 'Arroz Costeño 5kg', 'category': 'Abarrotes', 'cost': 18.50, 'price': 22.90, 'unit': 'BOLSA'},
            {'name': 'Aceite Primor 1L', 'category': 'Abarrotes', 'cost': 7.20, 'price': 9.50, 'unit': 'BOTELLA'},
            {'name': 'Azúcar Rubia 1kg', 'category': 'Abarrotes', 'cost': 3.80, 'price': 4.90, 'unit': 'BOLSA'},
            {'name': 'Fideos Lavaggi 500g', 'category': 'Abarrotes', 'cost': 2.30, 'price': 3.20, 'unit': 'PAQUETE'},
            {'name': 'Atún Florida', 'category': 'Abarrotes', 'cost': 3.50, 'price': 4.80, 'unit': 'LATA'},
            {'name': 'Sal Marina 1kg', 'category': 'Abarrotes', 'cost': 1.20, 'price': 2.00, 'unit': 'BOLSA'},
            {'name': 'Lentejas 500g', 'category': 'Abarrotes', 'cost': 3.80, 'price': 5.50, 'unit': 'BOLSA'},
            
            # Bebidas
            {'name': 'Coca Cola 600ml', 'category': 'Bebidas', 'cost': 2.00, 'price': 3.00, 'unit': 'BOTELLA'},
            {'name': 'Inca Kola 1.5L', 'category': 'Bebidas', 'cost': 4.20, 'price': 5.90, 'unit': 'BOTELLA'},
            {'name': 'Agua Cielo 625ml', 'category': 'Bebidas', 'cost': 0.80, 'price': 1.50, 'unit': 'BOTELLA'},
            {'name': 'Sporade 500ml', 'category': 'Bebidas', 'cost': 2.50, 'price': 3.50, 'unit': 'BOTELLA'},
            {'name': 'Cerveza Pilsen', 'category': 'Bebidas', 'cost': 4.00, 'price': 5.50, 'unit': 'LATA'},
            {'name': 'Frugos del Valle 1L', 'category': 'Bebidas', 'cost': 3.20, 'price': 4.50, 'unit': 'CAJA'},
            
            # Lácteos
            {'name': 'Leche Gloria Azul 1L', 'category': 'Lácteos', 'cost': 3.80, 'price': 4.90, 'unit': 'CAJA', 'perishable': True},
            {'name': 'Yogurt Gloria Fresa 1L', 'category': 'Lácteos', 'cost': 5.20, 'price': 6.90, 'unit': 'BOTELLA', 'perishable': True},
            {'name': 'Queso Fresco 250g', 'category': 'Lácteos', 'cost': 6.50, 'price': 8.50, 'unit': 'UNIDAD', 'perishable': True},
            {'name': 'Mantequilla Laive', 'category': 'Lácteos', 'cost': 4.20, 'price': 5.90, 'unit': 'BARRA', 'perishable': True},
            
            # Panadería
            {'name': 'Pan Francés', 'category': 'Panadería', 'cost': 0.15, 'price': 0.30, 'unit': 'UNIDAD', 'perishable': True},
            {'name': 'Pan de Molde Bimbo', 'category': 'Panadería', 'cost': 3.50, 'price': 4.90, 'unit': 'BOLSA', 'perishable': True},
            {'name': 'Galletas Oreo', 'category': 'Panadería', 'cost': 2.20, 'price': 3.20, 'unit': 'PAQUETE'},
            {'name': 'Tostadas Integrales', 'category': 'Panadería', 'cost': 2.80, 'price': 3.90, 'unit': 'PAQUETE'},
            
            # Limpieza
            {'name': 'Detergente Ariel 500g', 'category': 'Limpieza', 'cost': 5.50, 'price': 7.50, 'unit': 'BOLSA'},
            {'name': 'Lejía Clorox 1L', 'category': 'Limpieza', 'cost': 2.80, 'price': 3.90, 'unit': 'BOTELLA'},
            {'name': 'Papel Higiénico Elite 4u', 'category': 'Limpieza', 'cost': 4.20, 'price': 5.90, 'unit': 'PAQUETE'},
            {'name': 'Jabón Bolívar', 'category': 'Limpieza', 'cost': 2.00, 'price': 2.90, 'unit': 'BARRA'},
            
            # Cuidado Personal
            {'name': 'Shampoo Head & Shoulders', 'category': 'Cuidado Personal', 'cost': 12.50, 'price': 16.90, 'unit': 'FRASCO'},
            {'name': 'Pasta Dental Colgate', 'category': 'Cuidado Personal', 'cost': 3.80, 'price': 5.50, 'unit': 'TUBO'},
            {'name': 'Desodorante Rexona', 'category': 'Cuidado Personal', 'cost': 8.50, 'price': 11.90, 'unit': 'UNIDAD'},
            
            # Snacks
            {'name': 'Papas Lays Clásicas', 'category': 'Snacks', 'cost': 2.50, 'price': 3.50, 'unit': 'BOLSA'},
            {'name': 'Chocolate Sublime', 'category': 'Snacks', 'cost': 1.80, 'price': 2.50, 'unit': 'UNIDAD'},
            {'name': 'Galletas Casino', 'category': 'Snacks', 'cost': 0.80, 'price': 1.20, 'unit': 'PAQUETE'},
        ]
        
        # Crear productos
        for i, prod_data in enumerate(products_data):
            category = categories[prod_data.pop('category')]
            cost_price = Decimal(str(prod_data.pop('cost')))
            sale_price = Decimal(str(prod_data.pop('price')))
            is_perishable = prod_data.pop('perishable', False)
            
            product = Product.objects.create(
                code=f'PROD{str(i+1).zfill(4)}',
                barcode=f'775{str(random.randint(1000000000, 9999999999))}',
                name=prod_data['name'],
                category=category,
                supplier=random.choice(suppliers),
                cost_price=cost_price,
                sale_price=sale_price,
                current_stock=random.randint(20, 100),
                min_stock=random.randint(10, 20),
                max_stock=random.randint(80, 150),
                reorder_point=random.randint(15, 30),
                unit=prod_data['unit'],
                is_perishable=is_perishable,
                expiration_days=random.randint(7, 30) if is_perishable else None
            )
        
        self.stdout.write(f'✓ {Product.objects.count()} productos creados')
    
    def create_customers(self):
        """Crea clientes ficticios"""
        self.stdout.write('Creando clientes...')
        
        nombres = ['Juan', 'María', 'Carlos', 'Ana', 'Luis', 'Carmen', 'José', 'Rosa', 'Pedro', 'Lucia']
        apellidos = ['García', 'Rodriguez', 'Martinez', 'Lopez', 'Gonzalez', 'Perez', 'Sanchez', 'Ramirez', 'Torres', 'Flores']
        
        for i in range(50):  # Crear 50 clientes
            nombre = random.choice(nombres)
            apellido = random.choice(apellidos)
            
            customer = Customer.objects.create(
                first_name=nombre,
                last_name=apellido,
                document_type='DNI',
                document_number=f'{random.randint(10000000, 99999999)}',
                phone=f'9{random.randint(10000000, 99999999)}',
                email=f'{nombre.lower()}.{apellido.lower()}{random.randint(1, 99)}@gmail.com',
                address=f'Calle {random.randint(1, 50)}, {random.choice(["Mariano Melgar", "Paucarpata", "José Luis Bustamante"])}',
                customer_type=random.choice(['REGULAR', 'FREQUENT', 'VIP']),
                credit_limit=Decimal(str(random.choice([0, 100, 500, 1000])))
            )
        
        self.stdout.write(f'✓ {Customer.objects.count()} clientes creados')
    
    def generate_historical_data(self):
        """Genera 2 años de datos históricos de ventas y movimientos"""
        self.stdout.write('Generando datos históricos (2 años)...')
        
        # Obtener datos necesarios
        products = list(Product.objects.all())
        customers = list(Customer.objects.all())
        try:
            admin_user = User.objects.get(username='admin')
        except User.DoesNotExist:
            admin_user = User.objects.first()
            if not admin_user:
                self.stdout.write(self.style.WARNING('No hay usuarios. Creando usuario admin...'))
                admin_user = User.objects.create_superuser('admin', 'admin@minimarket.com', 'admin123')
        
        # Fecha inicial: hace 2 años
        from django.utils import timezone
        start_date = timezone.now() - timedelta(days=730)
        current_date = start_date
        
        sale_counter = 1
        total_days = 0
        
        while current_date <= timezone.now():
            # Generar entre 5 y 20 ventas por día
            num_sales = random.randint(5, 20)
            
            for _ in range(num_sales):
                # Crear hora aleatoria para la venta (entre 8am y 8pm)
                sale_datetime = current_date.replace(
                    hour=random.randint(8, 20),
                    minute=random.randint(0, 59),
                    second=0,
                    microsecond=0
                )
                
                # Crear venta
                sale = Sale.objects.create(
                    sale_number=f'V{str(sale_counter).zfill(6)}',
                    customer=random.choice(customers) if random.random() > 0.3 else None,
                    seller=admin_user,
                    payment_method=random.choice(['CASH', 'CARD', 'YAPE', 'PLIN']),
                    status='COMPLETED',
                    discount_percentage=Decimal(str(random.choice([0, 0, 0, 5, 10]))),
                    sale_date=sale_datetime
                )
                
                # Agregar entre 1 y 10 items a la venta
                num_items = random.randint(1, 10)
                selected_products = random.sample(products, min(num_items, len(products)))
                
                for product in selected_products:
                    quantity = random.randint(1, 5)
                    SaleItem.objects.create(
                        sale=sale,
                        product=product,
                        quantity=quantity,
                        unit_price=product.sale_price,
                        discount_percentage=Decimal(str(random.choice([0, 0, 0, 5, 10])))
                    )
                
                # Calcular totales
                sale.calculate_totals()
                sale.save()
                
                # Actualizar información del cliente si existe
                if sale.customer:
                    sale.customer.total_purchases += sale.total
                    sale.customer.purchase_count += 1
                    sale.customer.last_purchase_date = sale_datetime
                    sale.customer.save()
                
                sale_counter += 1
            
            # Generar resumen diario
            self.create_daily_summary(current_date.date())
            
            # Avanzar al siguiente día
            current_date += timedelta(days=1)
            total_days += 1
            
            # Mostrar progreso cada 30 días
            if total_days % 30 == 0:
                self.stdout.write(f'  Procesando... {total_days} días completados')
        
        self.stdout.write(f'✓ {Sale.objects.count()} ventas generadas')
        self.stdout.write(f'✓ {DailySummary.objects.count()} resúmenes diarios creados')
    
    def create_daily_summary(self, date):
        """Crea el resumen diario de ventas"""
        from django.db.models import Sum, Count, Avg
        
        sales = Sale.objects.filter(sale_date__date=date, status='COMPLETED')
        
        if sales.exists():
            summary = DailySummary.objects.create(date=date)
            summary.calculate_summary()
            summary.save()