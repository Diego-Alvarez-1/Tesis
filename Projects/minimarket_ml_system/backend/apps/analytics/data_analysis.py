import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime, timedelta
from django.db.models import Sum, Count, Avg, F, Q
from apps.products.models import Product, Category
from apps.sales.models import Sale, SaleItem, DailySummary
from apps.inventory.models import StockMovement
import os

class DataAnalyzer:
    """Clase para realizar análisis exploratorio de datos del minimarket"""
    
    def __init__(self):
        self.setup_matplotlib()
        self.output_dir = 'data/analysis_reports'
        os.makedirs(self.output_dir, exist_ok=True)
    
    def setup_matplotlib(self):
        """Configura matplotlib para mejores gráficos"""
        plt.style.use('seaborn-v0_8-darkgrid')
        plt.rcParams['figure.figsize'] = (12, 6)
        plt.rcParams['font.size'] = 10
        plt.rcParams['axes.titlesize'] = 14
        plt.rcParams['axes.labelsize'] = 12
        plt.rcParams['xtick.labelsize'] = 10
        plt.rcParams['ytick.labelsize'] = 10
    
    def analyze_sales_patterns(self):
        """Analiza patrones de ventas"""
        print("=== ANÁLISIS DE PATRONES DE VENTAS ===")
        
        # 1. Ventas por día de la semana
        sales_data = Sale.objects.filter(status='COMPLETED').values('sale_date')
        df_sales = pd.DataFrame(sales_data)
        df_sales['day_of_week'] = pd.to_datetime(df_sales['sale_date']).dt.day_name()
        df_sales['hour'] = pd.to_datetime(df_sales['sale_date']).dt.hour
        
        # Gráfico de ventas por día de la semana
        plt.figure(figsize=(10, 6))
        day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        day_counts = df_sales['day_of_week'].value_counts().reindex(day_order)
        day_counts.plot(kind='bar', color='skyblue')
        plt.title('Distribución de Ventas por Día de la Semana')
        plt.xlabel('Día de la Semana')
        plt.ylabel('Número de Ventas')
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.savefig(f'{self.output_dir}/ventas_por_dia_semana.png')
        plt.close()
        
        # 2. Ventas por hora del día
        plt.figure(figsize=(12, 6))
        hour_counts = df_sales['hour'].value_counts().sort_index()
        hour_counts.plot(kind='line', marker='o', color='darkblue')
        plt.title('Distribución de Ventas por Hora del Día')
        plt.xlabel('Hora del Día')
        plt.ylabel('Número de Ventas')
        plt.grid(True, alpha=0.3)
        plt.tight_layout()
        plt.savefig(f'{self.output_dir}/ventas_por_hora.png')
        plt.close()
        
        # 3. Tendencia de ventas mensuales
        monthly_sales = DailySummary.objects.values('date__year', 'date__month').annotate(
            total=Sum('total_sales'),
            count=Sum('sale_count')
        ).order_by('date__year', 'date__month')
        
        df_monthly = pd.DataFrame(monthly_sales)
        if not df_monthly.empty:
            df_monthly['period'] = pd.to_datetime(
                df_monthly['date__year'].astype(str) + '-' + 
                df_monthly['date__month'].astype(str) + '-01'
            )
            
            fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 10))
            
            # Gráfico de ventas totales
            ax1.plot(df_monthly['period'], df_monthly['total'], marker='o', linewidth=2)
            ax1.set_title('Tendencia de Ventas Mensuales - Monto Total')
            ax1.set_xlabel('Mes')
            ax1.set_ylabel('Ventas Totales (S/.)')
            ax1.grid(True, alpha=0.3)
            
            # Gráfico de cantidad de ventas
            ax2.plot(df_monthly['period'], df_monthly['count'], marker='s', linewidth=2, color='green')
            ax2.set_title('Tendencia de Ventas Mensuales - Cantidad')
            ax2.set_xlabel('Mes')
            ax2.set_ylabel('Cantidad de Ventas')
            ax2.grid(True, alpha=0.3)
            
            plt.tight_layout()
            plt.savefig(f'{self.output_dir}/tendencia_ventas_mensuales.png')
            plt.close()
        
        return {
            'ventas_por_dia': day_counts.to_dict(),
            'ventas_por_hora': hour_counts.to_dict(),
            'tendencia_mensual': df_monthly.to_dict('records') if not df_monthly.empty else []
        }
    
    def analyze_product_performance(self):
        """Analiza el rendimiento de productos"""
        print("=== ANÁLISIS DE RENDIMIENTO DE PRODUCTOS ===")
        
        # Top 20 productos más vendidos
        top_products = SaleItem.objects.values(
            'product__name', 'product__category__name'
        ).annotate(
            total_quantity=Sum('quantity'),
            total_revenue=Sum('total_price')
        ).order_by('-total_quantity')[:20]
        
        df_top = pd.DataFrame(top_products)
        
        if not df_top.empty:
            # Gráfico de productos más vendidos
            plt.figure(figsize=(12, 8))
            plt.barh(df_top['product__name'], df_top['total_quantity'])
            plt.xlabel('Cantidad Vendida')
            plt.title('Top 20 Productos Más Vendidos')
            plt.tight_layout()
            plt.savefig(f'{self.output_dir}/top_productos_vendidos.png')
            plt.close()
            
            # Análisis por categoría
            category_sales = SaleItem.objects.values(
                'product__category__name'
            ).annotate(
                total_quantity=Sum('quantity'),
                total_revenue=Sum('total_price')
            ).order_by('-total_revenue')
            
            df_category = pd.DataFrame(category_sales)
            
            # Gráfico circular de ventas por categoría
            plt.figure(figsize=(10, 8))
            plt.pie(df_category['total_revenue'], 
                   labels=df_category['product__category__name'],
                   autopct='%1.1f%%',
                   startangle=90)
            plt.title('Distribución de Ingresos por Categoría')
            plt.tight_layout()
            plt.savefig(f'{self.output_dir}/ventas_por_categoria.png')
            plt.close()
        
        return {
            'top_productos': df_top.to_dict('records') if not df_top.empty else [],
            'ventas_categoria': df_category.to_dict('records') if 'df_category' in locals() else []
        }
    
    def analyze_inventory_metrics(self):
        """Analiza métricas de inventario"""
        print("=== ANÁLISIS DE MÉTRICAS DE INVENTARIO ===")
        
        products = Product.objects.all()
        inventory_data = []
        
        for product in products:
            inventory_data.append({
                'producto': product.name,
                'categoria': product.category.name,
                'stock_actual': product.current_stock,
                'stock_minimo': product.min_stock,
                'stock_maximo': product.max_stock,
                'punto_reorden': product.reorder_point,
                'estado_stock': product.stock_status,
                'necesita_reorden': product.needs_reorder
            })
        
        df_inventory = pd.DataFrame(inventory_data)
        
        # Análisis de estado de stock
        stock_status_counts = df_inventory['estado_stock'].value_counts()
        
        plt.figure(figsize=(10, 6))
        colors = {'SIN_STOCK': 'red', 'STOCK_BAJO': 'orange', 'NORMAL': 'green', 'SOBRESTOCK': 'blue'}
        stock_status_counts.plot(kind='bar', color=[colors.get(x, 'gray') for x in stock_status_counts.index])
        plt.title('Distribución de Estados de Stock')
        plt.xlabel('Estado de Stock')
        plt.ylabel('Cantidad de Productos')
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.savefig(f'{self.output_dir}/estado_stock.png')
        plt.close()
        
        # Productos que necesitan reorden
        reorder_needed = df_inventory[df_inventory['necesita_reorden'] == True]
        
        return {
            'estado_stock': stock_status_counts.to_dict(),
            'productos_reorden': len(reorder_needed),
            'lista_reorden': reorder_needed[['producto', 'stock_actual', 'punto_reorden']].to_dict('records')
        }
    
    def identify_demand_patterns(self):
        """Identifica patrones de demanda por producto"""
        print("=== IDENTIFICACIÓN DE PATRONES DE DEMANDA ===")
        
        # Análisis de estacionalidad
        seasonal_data = []
        
        # Obtener ventas por mes para cada producto
        product_monthly_sales = SaleItem.objects.values(
            'product__name',
            'sale__sale_date__month'
        ).annotate(
            total_quantity=Sum('quantity')
        ).order_by('product__name', 'sale__sale_date__month')
        
        # Convertir a DataFrame para análisis
        df_seasonal = pd.DataFrame(product_monthly_sales)
        
        if not df_seasonal.empty:
            # Calcular coeficiente de variación por producto
            cv_by_product = df_seasonal.groupby('product__name')['total_quantity'].agg(['mean', 'std'])
            cv_by_product['cv'] = cv_by_product['std'] / cv_by_product['mean']
            cv_by_product = cv_by_product.sort_values('cv', ascending=False)
            
            # Productos con mayor estacionalidad (CV alto)
            high_seasonality = cv_by_product[cv_by_product['cv'] > 0.5].head(10)
            
            # Gráfico de productos con alta estacionalidad
            if not high_seasonality.empty:
                plt.figure(figsize=(12, 6))
                high_seasonality['cv'].plot(kind='bar')
                plt.title('Productos con Mayor Estacionalidad (Coeficiente de Variación)')
                plt.xlabel('Producto')
                plt.ylabel('Coeficiente de Variación')
                plt.xticks(rotation=45, ha='right')
                plt.tight_layout()
                plt.savefig(f'{self.output_dir}/productos_estacionales.png')
                plt.close()
        
        return {
            'productos_estacionales': high_seasonality.to_dict() if 'high_seasonality' in locals() and not high_seasonality.empty else {}
        }
    
    def generate_summary_report(self):
        """Genera un reporte resumen del análisis"""
        print("\n=== GENERANDO REPORTE RESUMEN ===")
        
        # Recopilar todos los análisis
        sales_patterns = self.analyze_sales_patterns()
        product_performance = self.analyze_product_performance()
        inventory_metrics = self.analyze_inventory_metrics()
        demand_patterns = self.identify_demand_patterns()
        
        # Crear reporte en texto
        report = f"""
REPORTE DE ANÁLISIS EXPLORATORIO DE DATOS
Minimarket - Sistema de Gestión Logística
Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

1. RESUMEN DE VENTAS
-------------------
- Día con más ventas: {max(sales_patterns['ventas_por_dia'].items(), key=lambda x: x[1])[0] if sales_patterns['ventas_por_dia'] else 'N/A'}
- Hora pico de ventas: {max(sales_patterns['ventas_por_hora'].items(), key=lambda x: x[1])[0] if sales_patterns['ventas_por_hora'] else 'N/A'}h

2. PRODUCTOS TOP
----------------
Top 3 productos más vendidos:
"""
        
        for i, product in enumerate(product_performance['top_productos'][:3], 1):
            report += f"{i}. {product['product__name']} - {product['total_quantity']} unidades\n"
        
        report += f"""
3. ESTADO DE INVENTARIO
----------------------
- Productos sin stock: {inventory_metrics['estado_stock'].get('SIN_STOCK', 0)}
- Productos con stock bajo: {inventory_metrics['estado_stock'].get('STOCK_BAJO', 0)}
- Productos que necesitan reorden: {inventory_metrics['productos_reorden']}

4. OBSERVACIONES
---------------
- Se han identificado patrones de venta consistentes por día de semana
- Existe estacionalidad en ciertos productos
- Se recomienda ajustar niveles de reorden basados en patrones históricos
"""
        
        # Guardar reporte
        with open(f'{self.output_dir}/reporte_resumen.txt', 'w', encoding='utf-8') as f:
            f.write(report)
        
        print(f"\nReporte guardado en: {self.output_dir}/reporte_resumen.txt")
        print("Gráficos generados en:", self.output_dir)
        
        return {
            'sales_patterns': sales_patterns,
            'product_performance': product_performance,
            'inventory_metrics': inventory_metrics,
            'demand_patterns': demand_patterns
        }

# Función para ejecutar el análisis
def run_analysis():
    analyzer = DataAnalyzer()
    results = analyzer.generate_summary_report()
    return results