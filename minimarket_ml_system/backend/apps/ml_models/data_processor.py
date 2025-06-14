# Archivo: minimarket_ml_system/backend/apps/ml_models/data_processor.py

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from django.db.models import Sum, Count, Avg, F
from apps.products.models import Product
from apps.sales.models import Sale, SaleItem, DailySummary
import warnings
from decimal import Decimal
warnings.filterwarnings('ignore')

class DataProcessor:
    """Clase para procesar datos históricos y prepararlos para ML"""
    
    def __init__(self):
        self.processed_data = None
        self.features = None
        self.target = None
    
    def extract_sales_data(self, days_back=730):
        """Extrae datos de ventas de los últimos N días"""
        print(f"Extrayendo datos de ventas de los últimos {days_back} días...")
        
        # Fecha límite
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=days_back)
        
        # Obtener ventas agrupadas por producto y fecha
        sales_data = SaleItem.objects.filter(
            sale__sale_date__date__gte=start_date,
            sale__status='COMPLETED'
        ).values(
            'product__id',
            'product__name',
            'product__category__name',
            'sale__sale_date__date'
        ).annotate(
            quantity_sold=Sum('quantity'),
            revenue=Sum('total_price'),
            transactions=Count('sale__id', distinct=True)
        ).order_by('product__id', 'sale__sale_date__date')
        
        # Convertir a DataFrame
        df = pd.DataFrame(sales_data)
        
        if df.empty:
            raise ValueError("No hay datos de ventas disponibles")
        
        # Renombrar columnas
        df.columns = ['product_id', 'product_name', 'category', 'date', 
                     'quantity_sold', 'revenue', 'transactions']
        
        # Convertir fecha
        df['date'] = pd.to_datetime(df['date'])
        
        # CONVERTIR DECIMALES A FLOAT PARA EVITAR ERRORES
        for col in ['quantity_sold', 'revenue', 'transactions']:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)
        
        print(f"✓ Datos extraídos: {len(df)} registros")
        return df
    
    def create_time_series_features(self, df):
        """Crea características temporales para cada producto"""
        print("Creando características temporales...")
        
        # Crear rango completo de fechas
        date_range = pd.date_range(
            start=df['date'].min(),
            end=df['date'].max(),
            freq='D'
        )
        
        # Obtener productos únicos
        products = df[['product_id', 'product_name', 'category']].drop_duplicates()
        
        # Crear DataFrame completo con todas las combinaciones producto-fecha
        complete_data = []
        
        for _, product in products.iterrows():
            product_df = pd.DataFrame({
                'date': date_range,
                'product_id': product['product_id'],
                'product_name': product['product_name'],
                'category': product['category']
            })
            complete_data.append(product_df)
        
        complete_df = pd.concat(complete_data, ignore_index=True)
        
        # Hacer merge con datos reales
        merged_df = complete_df.merge(
            df[['product_id', 'date', 'quantity_sold', 'revenue', 'transactions']],
            on=['product_id', 'date'],
            how='left'
        )
        
        # Rellenar valores faltantes con 0 y asegurar tipo float
        merged_df['quantity_sold'] = pd.to_numeric(merged_df['quantity_sold'], errors='coerce').fillna(0)
        merged_df['revenue'] = pd.to_numeric(merged_df['revenue'], errors='coerce').fillna(0)
        merged_df['transactions'] = pd.to_numeric(merged_df['transactions'], errors='coerce').fillna(0)
        
        # Crear características temporales
        merged_df['year'] = merged_df['date'].dt.year
        merged_df['month'] = merged_df['date'].dt.month
        merged_df['day'] = merged_df['date'].dt.day
        merged_df['dayofweek'] = merged_df['date'].dt.dayofweek
        merged_df['dayofyear'] = merged_df['date'].dt.dayofyear
        merged_df['week'] = merged_df['date'].dt.isocalendar().week
        merged_df['quarter'] = merged_df['date'].dt.quarter
        merged_df['is_weekend'] = (merged_df['dayofweek'] >= 5).astype(int)
        merged_df['is_month_start'] = merged_df['date'].dt.is_month_start.astype(int)
        merged_df['is_month_end'] = merged_df['date'].dt.is_month_end.astype(int)
        
        print(f"✓ Características temporales creadas: {len(merged_df)} registros")
        return merged_df
    
    def create_lag_features(self, df, target_col='quantity_sold', lags=[1, 7, 14, 30]):
        """Crea características de lag (valores pasados)"""
        print(f"Creando características de lag para {target_col}...")
        
        # Ordenar por producto y fecha
        df = df.sort_values(['product_id', 'date'])
        
        # Asegurar que la columna target es numérica
        df[target_col] = pd.to_numeric(df[target_col], errors='coerce').fillna(0)
        
        # Crear lags por producto
        for lag in lags:
            df[f'{target_col}_lag_{lag}'] = df.groupby('product_id')[target_col].shift(lag).fillna(0)
        
        # Crear promedios móviles
        for window in [7, 14, 30]:
            df[f'{target_col}_ma_{window}'] = df.groupby('product_id')[target_col].rolling(
                window=window, min_periods=1
            ).mean().reset_index(0, drop=True).fillna(0)
        
        # Crear características de tendencia
        df[f'{target_col}_trend_7'] = df.groupby('product_id')[target_col].rolling(
            window=7, min_periods=2
        ).apply(lambda x: np.polyfit(range(len(x)), x, 1)[0] if len(x) > 1 else 0).reset_index(0, drop=True).fillna(0)
        
        print(f"✓ Características de lag creadas con {len(lags)} lags")
        return df
    
    def create_product_features(self, df):
        """Crea características específicas del producto"""
        print("Creando características del producto...")
        
        # Obtener información de productos
        products_info = Product.objects.values(
            'id', 'cost_price', 'sale_price', 'min_stock', 'max_stock',
            'reorder_point', 'is_perishable', 'expiration_days'
        )
        
        products_df = pd.DataFrame(products_info)
        products_df = products_df.rename(columns={'id': 'product_id'})
        
        # CONVERTIR DECIMALES A FLOAT
        decimal_columns = ['cost_price', 'sale_price']
        for col in decimal_columns:
            if col in products_df.columns:
                products_df[col] = products_df[col].apply(lambda x: float(x) if x is not None else 0.0)
        
        # Calcular características agregadas por producto
        product_stats = df.groupby('product_id').agg({
            'quantity_sold': ['mean', 'std', 'min', 'max'],
            'revenue': ['mean', 'std'],
            'transactions': ['mean', 'std']
        }).round(2)
        
        # Aplanar nombres de columnas
        product_stats.columns = ['_'.join(col).strip() for col in product_stats.columns]
        product_stats = product_stats.reset_index()
        
        # Rellenar NaN con 0
        product_stats = product_stats.fillna(0)
        
        # Merge características del producto
        if not products_df.empty:
            df = df.merge(products_df, on='product_id', how='left')
            
            # Crear características derivadas con manejo de errores
            df['cost_price'] = pd.to_numeric(df['cost_price'], errors='coerce').fillna(0)
            df['sale_price'] = pd.to_numeric(df['sale_price'], errors='coerce').fillna(0)
            
            # Calcular margen de ganancia con manejo de división por cero
            df['profit_margin'] = np.where(
                df['cost_price'] > 0,
                ((df['sale_price'] - df['cost_price']) / df['cost_price'] * 100),
                0
            )
            
            df['min_stock'] = pd.to_numeric(df['min_stock'], errors='coerce').fillna(0)
            df['max_stock'] = pd.to_numeric(df['max_stock'], errors='coerce').fillna(0)
            df['stock_range'] = df['max_stock'] - df['min_stock']
            df['is_perishable'] = df['is_perishable'].astype(int)
            df['expiration_days'] = pd.to_numeric(df['expiration_days'], errors='coerce').fillna(0)
        
        # Merge estadísticas del producto
        df = df.merge(product_stats, on='product_id', how='left')
        
        # Rellenar cualquier NaN restante
        df = df.fillna(0)
        
        print("✓ Características del producto creadas")
        return df
    
    def create_seasonal_features(self, df):
        """Crea características estacionales"""
        print("Creando características estacionales...")
        
        # Características trigonométricas para capturar ciclos
        df['sin_dayofyear'] = np.sin(2 * np.pi * df['dayofyear'] / 365.25)
        df['cos_dayofyear'] = np.cos(2 * np.pi * df['dayofyear'] / 365.25)
        df['sin_dayofweek'] = np.sin(2 * np.pi * df['dayofweek'] / 7)
        df['cos_dayofweek'] = np.cos(2 * np.pi * df['dayofweek'] / 7)
        df['sin_month'] = np.sin(2 * np.pi * df['month'] / 12)
        df['cos_month'] = np.cos(2 * np.pi * df['month'] / 12)
        
        # Características de temporadas
        def get_season(month):
            if month in [12, 1, 2]:
                return 0  # Verano
            elif month in [3, 4, 5]:
                return 1  # Otoño
            elif month in [6, 7, 8]:
                return 2  # Invierno
            else:
                return 3  # Primavera
        
        df['season'] = df['month'].apply(get_season)
        
        # Características de feriados aproximados (simplificado)
        df['is_holiday'] = df['date'].apply(
            lambda x: 1 if x.month == 12 and x.day in [24, 25, 31] or 
                           x.month == 1 and x.day == 1 or
                           x.month == 7 and x.day == 28 or
                           x.month == 8 and x.day == 30 else 0
        )
        
        print("✓ Características estacionales creadas")
        return df
    
    def encode_categorical_features(self, df):
        """Codifica características categóricas"""
        print("Codificando características categóricas...")
        
        # One-hot encoding para categorías
        if 'category' in df.columns:
            category_dummies = pd.get_dummies(df['category'], prefix='category')
            df = pd.concat([df, category_dummies], axis=1)
        
        # Encoding para temporadas
        if 'season' in df.columns:
            season_dummies = pd.get_dummies(df['season'], prefix='season')
            df = pd.concat([df, season_dummies], axis=1)
        
        print("✓ Características categóricas codificadas")
        return df
    
    def process_complete_dataset(self, days_back=730):
        """Procesa el dataset completo para ML"""
        print("=" * 50)
        print("INICIANDO PROCESAMIENTO DE DATOS PARA ML")
        print("=" * 50)
        
        try:
            # 1. Extraer datos de ventas
            df = self.extract_sales_data(days_back)
            
            # 2. Crear series temporales completas
            df = self.create_time_series_features(df)
            
            # 3. Crear características de lag
            df = self.create_lag_features(df)
            
            # 4. Crear características del producto
            df = self.create_product_features(df)
            
            # 5. Crear características estacionales
            df = self.create_seasonal_features(df)
            
            # 6. Codificar características categóricas
            df = self.encode_categorical_features(df)
            
            # 7. Limpiar datos
            df = self.clean_data(df)
            
            self.processed_data = df
            print("=" * 50)
            print("PROCESAMIENTO COMPLETADO EXITOSAMENTE")
            print(f"Dataset final: {df.shape[0]} filas, {df.shape[1]} columnas")
            print("=" * 50)
            
            return df
            
        except Exception as e:
            print(f"Error en procesamiento: {str(e)}")
            raise
    
    def clean_data(self, df):
        """Limpia el dataset final"""
        print("Limpiando datos...")
        
        # Remover filas con valores faltantes en características críticas
        critical_cols = ['quantity_sold', 'product_id', 'date']
        df = df.dropna(subset=critical_cols)
        
        # Convertir todas las columnas numéricas a float
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # Llenar valores faltantes numéricos con mediana
        for col in numeric_cols:
            if df[col].isnull().any():
                median_val = df[col].median()
                df[col] = df[col].fillna(median_val if pd.notna(median_val) else 0)
        
        # Remover outliers extremos (> 3 desviaciones estándar) solo para columnas específicas
        outlier_cols = ['quantity_sold', 'revenue']
        for col in outlier_cols:
            if col in df.columns and len(df) > 100:  # Solo si hay suficientes datos
                # Calcular estadísticas robustas
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                
                # Definir límites usando IQR (más robusto que desviación estándar)
                lower_bound = Q1 - 3 * IQR
                upper_bound = Q3 + 3 * IQR
                
                # Filtrar outliers extremos
                df = df[(df[col] >= lower_bound) & (df[col] <= upper_bound)]
        
        # Asegurar que no hay valores infinitos
        df = df.replace([np.inf, -np.inf], 0)
        
        # Rellenar cualquier NaN restante con 0
        df = df.fillna(0)
        
        print(f"✓ Datos limpiados: {len(df)} registros finales")
        return df
    
    def prepare_features_target(self, df, target_col='quantity_sold', test_size=0.2):
        """Prepara características y target para entrenamiento"""
        print(f"Preparando características y target ({target_col})...")
        
        # Columnas a excluir de las características
        exclude_cols = [
            'product_id', 'product_name', 'date', 'category',
            target_col, 'revenue', 'transactions'
        ]
        
        # Seleccionar características
        feature_cols = [col for col in df.columns if col not in exclude_cols]
        
        X = df[feature_cols].copy()
        y = df[target_col].copy()
        
        # Convertir target a numérico
        y = pd.to_numeric(y, errors='coerce')
        
        # Remover filas donde el target es NaN
        mask = ~y.isnull()
        X = X[mask]
        y = y[mask]
        
        # Asegurar que todas las características son numéricas
        for col in X.columns:
            X[col] = pd.to_numeric(X[col], errors='coerce').fillna(0)
        
        print(f"✓ Características preparadas: {X.shape[1]} features")
        print(f"✓ Target preparado: {len(y)} muestras")
        
        self.features = X
        self.target = y
        
        return X, y
    
    def get_feature_names(self):
        """Retorna los nombres de las características"""
        if self.features is not None:
            return list(self.features.columns)
        return []
    
    def save_processed_data(self, filepath):
        """Guarda los datos procesados"""
        if self.processed_data is not None:
            self.processed_data.to_csv(filepath, index=False)
            print(f"✓ Datos guardados en: {filepath}")
        else:
            print("No hay datos procesados para guardar")
    
    def get_data_summary(self):
        """Retorna un resumen de los datos procesados"""
        if self.processed_data is None:
            return "No hay datos procesados"
        
        df = self.processed_data
        summary = {
            'total_records': len(df),
            'unique_products': df['product_id'].nunique(),
            'date_range': f"{df['date'].min()} a {df['date'].max()}",
            'avg_daily_sales': df.groupby('date')['quantity_sold'].sum().mean(),
            'total_revenue': df['revenue'].sum() if 'revenue' in df.columns else 0,
            'missing_values': df.isnull().sum().sum(),
            'features_count': len([col for col in df.columns if col not in ['product_id', 'product_name', 'date', 'category']])
        }
        
        return summary