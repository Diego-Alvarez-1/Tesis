import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db.models import Count
from apps.products.models import Category, Supplier, Product
from apps.inventory.models import StockMovement, PurchaseOrder
from apps.sales.models import Customer, Sale, SaleItem, DailySummary
from apps.ml_models.models import MLModel, DemandPrediction
from apps.analytics.models import Report, Dashboard, Alert, KPI

def check_stage2_completion():
    """Verifica que la Etapa 2 se haya completado correctamente"""
    print("=" * 60)
    print("VERIFICACIÓN DE ETAPA 2: ANÁLISIS Y RECOPILACIÓN DE DATOS")
    print("=" * 60)
    
    checks = []
    
    # 1. Verificar modelos creados
    print("\n1. VERIFICANDO MODELOS DE DATOS:")
    print("-" * 40)
    
    models_to_check = [
        (Category, "Categorías"),
        (Supplier, "Proveedores"),
        (Product, "Productos"),
        (Customer, "Clientes"),
        (Sale, "Ventas"),
        (SaleItem, "Items de Venta"),
        (StockMovement, "Movimientos de Stock"),
        (PurchaseOrder, "Órdenes de Compra"),
        (DailySummary, "Resúmenes Diarios"),
        (MLModel, "Modelos ML"),
        (DemandPrediction, "Predicciones de Demanda"),
        (Alert, "Alertas"),
        (KPI, "KPIs"),
    ]
    
    all_models_ok = True
    for model, name in models_to_check:
        count = model.objects.count()
        status = "✓" if count > 0 else "✗"
        print(f"{status} {name}: {count} registros")
        if count == 0 and model not in [MLModel, DemandPrediction]:
            all_models_ok = False
    
    checks.append(("Modelos de datos creados", all_models_ok))
    
    # 2. Verificar datos históricos
    print("\n2. VERIFICANDO DATOS HISTÓRICOS:")
    print("-" * 40)
    
    # Verificar ventas de los últimos 2 años
    from datetime import datetime, timedelta
    two_years_ago = datetime.now() - timedelta(days=730)
    historical_sales = Sale.objects.filter(sale_date__gte=two_years_ago).count()
    
    print(f"Ventas históricas (2 años): {historical_sales}")
    print(f"Promedio de ventas por día: {historical_sales / 730:.1f}")
    
    # Verificar diversidad de datos
    unique_customers = Customer.objects.count()
    unique_products = Product.objects.count()
    categories = Category.objects.count()
    
    print(f"\nDiversidad de datos:")
    print(f"- Clientes únicos: {unique_customers}")
    print(f"- Productos únicos: {unique_products}")
    print(f"- Categorías: {categories}")
    
    data_quality = historical_sales > 3000 and unique_customers > 30 and unique_products > 20
    checks.append(("Datos históricos suficientes", data_quality))
    
    # 3. Verificar archivos de análisis
    print("\n3. VERIFICANDO ARCHIVOS DE ANÁLISIS:")
    print("-" * 40)
    
    analysis_files = [
        'data/analysis_reports/ventas_por_dia_semana.png',
        'data/analysis_reports/ventas_por_hora.png',
        'data/analysis_reports/tendencia_ventas_mensuales.png',
        'data/analysis_reports/top_productos_vendidos.png',
        'data/analysis_reports/ventas_por_categoria.png',
        'data/analysis_reports/estado_stock.png',
        'data/analysis_reports/reporte_resumen.txt',
    ]
    
    analysis_ok = True
    for file in analysis_files:
        exists = os.path.exists(file)
        status = "✓" if exists else "✗"
        print(f"{status} {file}")
        if not exists:
            analysis_ok = False
    
    checks.append(("Archivos de análisis generados", analysis_ok))
    
    # 4. Verificar patrones identificados
    print("\n4. VERIFICANDO PATRONES DE DEMANDA:")
    print("-" * 40)
    
    # Productos más vendidos
    top_products = SaleItem.objects.values('product__name').annotate(
        total=Count('id')
    ).order_by('-total')[:5]
    
    print("Top 5 productos más vendidos:")
    for i, product in enumerate(top_products, 1):
        print(f"{i}. {product['product__name']}: {product['total']} ventas")
    
    patterns_ok = len(top_products) > 0
    checks.append(("Patrones de demanda identificados", patterns_ok))
    
    # 5. Resumen final
    print("\n" + "=" * 60)
    print("RESUMEN DE VERIFICACIÓN:")
    print("=" * 60)
    
    all_passed = True
    for check_name, passed in checks:
        status = "✓ COMPLETADO" if passed else "✗ PENDIENTE"
        print(f"{status}: {check_name}")
        if not passed:
            all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("✅ ETAPA 2 COMPLETADA EXITOSAMENTE!")
        print("\nPróximo paso: Etapa 3 - Desarrollo de Modelos de Machine Learning")
    else:
        print("⚠️ ETAPA 2 INCOMPLETA - Revise los items pendientes")
    print("=" * 60)
    
    return all_passed

if __name__ == "__main__":
    check_stage2_completion()