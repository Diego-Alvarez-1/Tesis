# Archivo: minimarket_ml_system/backend/apps/ml_models/predictor.py

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import joblib
import os
from django.conf import settings
from django.db import models 
from apps.products.models import Product
from apps.sales.models import SaleItem
from .data_processor import DataProcessor
import warnings
warnings.filterwarnings('ignore')

class DemandPredictor:
    """Clase para realizar predicciones de demanda"""
    
    def __init__(self, model_path=None):
        self.model = None
        self.model_name = None
        self.feature_names = []
        self.data_processor = DataProcessor()
        self.model_path = model_path
        
    def load_model(self, model_path=None):
        """Carga el modelo entrenado"""
        if model_path is None:
            model_path = self.find_latest_model()
        
        if not model_path or not os.path.exists(model_path):
            raise FileNotFoundError(f"No se encontró el modelo en: {model_path}")
        
        try:
            model_data = joblib.load(model_path)
            
            self.model = model_data['model']
            self.model_name = model_data['model_name']
            self.feature_names = model_data['feature_names']
            
            print(f"✓ Modelo cargado: {self.model_name}")
            return True
            
        except Exception as e:
            print(f"Error cargando modelo: {str(e)}")
            return False
    
    def find_latest_model(self):
        """Encuentra el modelo más reciente"""
        models_dir = os.path.join(settings.BASE_DIR, 'data', 'models')
        
        if not os.path.exists(models_dir):
            return None
        
        model_files = [f for f in os.listdir(models_dir) if f.endswith('.joblib')]
        
        if not model_files:
            return None
        
        # Ordenar por fecha de modificación (más reciente primero)
        model_files.sort(key=lambda x: os.path.getmtime(os.path.join(models_dir, x)), reverse=True)
        
        latest_model = os.path.join(models_dir, model_files[0])
        print(f"Modelo más reciente encontrado: {latest_model}")
        
        return latest_model
    
    def prepare_prediction_features(self, product_id, start_date, days_ahead=30):
        """Prepara las características para predicción"""
        print(f"Preparando características para producto {product_id}...")
        
        # Obtener información del producto
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            raise ValueError(f"Producto {product_id} no encontrado")
        
        # Obtener datos históricos del producto (últimos 90 días para context)
        historical_data = self.get_historical_data(product_id, days_back=90)
        
        # Crear fechas futuras
        dates = pd.date_range(start=start_date, periods=days_ahead, freq='D')
        
        # Crear DataFrame base para predicciones
        prediction_df = pd.DataFrame({
            'date': dates,
            'product_id': product_id,
            'product_name': product.name,
            'category': product.category.name
        })
        
        # Crear características temporales
        prediction_df['year'] = prediction_df['date'].dt.year
        prediction_df['month'] = prediction_df['date'].dt.month
        prediction_df['day'] = prediction_df['date'].dt.day
        prediction_df['dayofweek'] = prediction_df['date'].dt.dayofweek
        prediction_df['dayofyear'] = prediction_df['date'].dt.dayofyear
        prediction_df['week'] = prediction_df['date'].dt.isocalendar().week
        prediction_df['quarter'] = prediction_df['date'].dt.quarter
        prediction_df['is_weekend'] = (prediction_df['dayofweek'] >= 5).astype(int)
        prediction_df['is_month_start'] = prediction_df['date'].dt.is_month_start.astype(int)
        prediction_df['is_month_end'] = prediction_df['date'].dt.is_month_end.astype(int)
        
        # Características estacionales
        prediction_df['sin_dayofyear'] = np.sin(2 * np.pi * prediction_df['dayofyear'] / 365.25)
        prediction_df['cos_dayofyear'] = np.cos(2 * np.pi * prediction_df['dayofyear'] / 365.25)
        prediction_df['sin_dayofweek'] = np.sin(2 * np.pi * prediction_df['dayofweek'] / 7)
        prediction_df['cos_dayofweek'] = np.cos(2 * np.pi * prediction_df['dayofweek'] / 7)
        prediction_df['sin_month'] = np.sin(2 * np.pi * prediction_df['month'] / 12)
        prediction_df['cos_month'] = np.cos(2 * np.pi * prediction_df['month'] / 12)
        
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
        
        prediction_df['season'] = prediction_df['month'].apply(get_season)
        
        # Características de feriados
        prediction_df['is_holiday'] = prediction_df['date'].apply(
            lambda x: 1 if x.month == 12 and x.day in [24, 25, 31] or 
                           x.month == 1 and x.day == 1 or
                           x.month == 7 and x.day == 28 or
                           x.month == 8 and x.day == 30 else 0
        )
        
        # Características del producto
        prediction_df['cost_price'] = float(product.cost_price)
        prediction_df['sale_price'] = float(product.sale_price)
        prediction_df['min_stock'] = product.min_stock
        prediction_df['max_stock'] = product.max_stock
        prediction_df['reorder_point'] = product.reorder_point
        prediction_df['is_perishable'] = int(product.is_perishable)
        prediction_df['expiration_days'] = product.expiration_days or 0
        prediction_df['profit_margin'] = ((product.sale_price - product.cost_price) / product.cost_price * 100)
        prediction_df['stock_range'] = product.max_stock - product.min_stock
        
        # Características basadas en datos históricos
        if not historical_data.empty:
            # Estadísticas del producto
            prediction_df['quantity_sold_mean'] = historical_data['quantity_sold'].mean()
            prediction_df['quantity_sold_std'] = historical_data['quantity_sold'].std()
            prediction_df['quantity_sold_min'] = historical_data['quantity_sold'].min()
            prediction_df['quantity_sold_max'] = historical_data['quantity_sold'].max()
            
            # Lags (usar últimos valores disponibles)
            last_values = historical_data.tail(30)['quantity_sold'].values
            
            for lag in [1, 7, 14, 30]:
                if len(last_values) >= lag:
                    prediction_df[f'quantity_sold_lag_{lag}'] = last_values[-lag]
                else:
                    prediction_df[f'quantity_sold_lag_{lag}'] = last_values[-1] if len(last_values) > 0 else 0
            
            # Promedios móviles
            for window in [7, 14, 30]:
                if len(last_values) >= window:
                    prediction_df[f'quantity_sold_ma_{window}'] = last_values[-window:].mean()
                else:
                    prediction_df[f'quantity_sold_ma_{window}'] = last_values.mean() if len(last_values) > 0 else 0
            
            # Tendencia
            if len(last_values) >= 7:
                trend = np.polyfit(range(len(last_values[-7:])), last_values[-7:], 1)[0]
                prediction_df['quantity_sold_trend_7'] = trend
            else:
                prediction_df['quantity_sold_trend_7'] = 0
                
        else:
            # Valores por defecto si no hay datos históricos
            for col in ['quantity_sold_mean', 'quantity_sold_std', 'quantity_sold_min', 'quantity_sold_max']:
                prediction_df[col] = 0
            
            for lag in [1, 7, 14, 30]:
                prediction_df[f'quantity_sold_lag_{lag}'] = 0
            
            for window in [7, 14, 30]:
                prediction_df[f'quantity_sold_ma_{window}'] = 0
            
            prediction_df['quantity_sold_trend_7'] = 0
        
        # One-hot encoding para categoría
        categories = ['Abarrotes', 'Bebidas', 'Lácteos', 'Panadería', 'Carnes y Embutidos',
                     'Frutas y Verduras', 'Limpieza', 'Cuidado Personal', 'Snacks', 'Congelados']
        
        for cat in categories:
            prediction_df[f'category_{cat}'] = int(product.category.name == cat)
        
        # One-hot encoding para temporadas
        for season in [0, 1, 2, 3]:
            prediction_df[f'season_{season}'] = (prediction_df['season'] == season).astype(int)
        
        return prediction_df
    
    def get_historical_data(self, product_id, days_back=90):
        """Obtiene datos históricos del producto"""
        from django.db.models import Sum  # ← AÑADIR ESTA LÍNEA
        
        end_date = datetime.now().date()
        start_date = end_date - timedelta(days=days_back)
        
        sales_data = SaleItem.objects.filter(
            product_id=product_id,
            sale__sale_date__date__gte=start_date,
            sale__status='COMPLETED'
        ).values(
            'sale__sale_date__date'
        ).annotate(
            quantity_sold=Sum('quantity')
        ).order_by('sale__sale_date__date')
        
        if not sales_data:
            return pd.DataFrame()
        
        df = pd.DataFrame(sales_data)
        df.columns = ['date', 'quantity_sold']
        df['date'] = pd.to_datetime(df['date'])
        
        return df
    
    def predict_demand(self, product_id, start_date=None, days_ahead=30):
        """Predice la demanda para un producto específico"""
        if self.model is None:
            success = self.load_model()
            if not success:
                raise RuntimeError("No se pudo cargar el modelo")
        
        if start_date is None:
            start_date = datetime.now().date() + timedelta(days=1)
        elif isinstance(start_date, str):
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        
        print(f"Prediciendo demanda para producto {product_id} desde {start_date} por {days_ahead} días")
        
        # Preparar características
        features_df = self.prepare_prediction_features(product_id, start_date, days_ahead)
        
        # Seleccionar solo las características que usa el modelo
        try:
            # Asegurar que tenemos todas las características necesarias
            missing_features = set(self.feature_names) - set(features_df.columns)
            if missing_features:
                print(f"Características faltantes: {missing_features}")
                # Añadir características faltantes con valor 0
                for feature in missing_features:
                    features_df[feature] = 0
            
            # Seleccionar características en el orden correcto
            X = features_df[self.feature_names]
            
        except KeyError as e:
            raise ValueError(f"Error preparando características: {e}")
        
        # Realizar predicción
        predictions = self.model.predict(X)
        
        # Asegurar valores no negativos
        predictions = np.maximum(predictions, 0)
        
        # Crear resultado
        result_df = pd.DataFrame({
            'date': features_df['date'],
            'predicted_quantity': np.round(predictions, 2),
            'day_of_week': features_df['dayofweek'],
            'is_weekend': features_df['is_weekend'],
            'is_holiday': features_df['is_holiday']
        })
        
        # Calcular intervalos de confianza (simplificado)
        std_prediction = np.std(predictions)
        result_df['lower_bound'] = np.maximum(predictions - 1.96 * std_prediction, 0)
        result_df['upper_bound'] = predictions + 1.96 * std_prediction
        
        print(f"✓ Predicción completada para {len(predictions)} días")
        print(f"  Demanda promedio predicha: {np.mean(predictions):.2f}")
        print(f"  Demanda total predicha: {np.sum(predictions):.2f}")
        
        return result_df
    
    def predict_multiple_products(self, product_ids, start_date=None, days_ahead=30):
        """Predice demanda para múltiples productos"""
        if not isinstance(product_ids, list):
            product_ids = [product_ids]
        
        results = {}
        
        for product_id in product_ids:
            try:
                prediction = self.predict_demand(product_id, start_date, days_ahead)
                results[product_id] = prediction
                print(f"✓ Predicción completada para producto {product_id}")
                
            except Exception as e:
                print(f"✗ Error prediciendo producto {product_id}: {str(e)}")
                results[product_id] = None
        
        return results
    
    def generate_reorder_recommendations(self, product_id, days_ahead=30):
        """Genera recomendaciones de reorden basadas en predicciones"""
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            raise ValueError(f"Producto {product_id} no encontrado")
        
        # Obtener predicción
        prediction_df = self.predict_demand(product_id, days_ahead=days_ahead)
        
        # Calcular métricas
        total_predicted_demand = prediction_df['predicted_quantity'].sum()
        avg_daily_demand = prediction_df['predicted_quantity'].mean()
        max_daily_demand = prediction_df['predicted_quantity'].max()
        
        # Stock actual
        current_stock = product.current_stock
        
        # Calcular días de inventario disponible
        if avg_daily_demand > 0:
            days_of_stock = current_stock / avg_daily_demand
        else:
            days_of_stock = float('inf')
        
        # Determinar si necesita reorden
        needs_reorder = (
            current_stock <= product.reorder_point or
            days_of_stock <= 7 or
            total_predicted_demand > current_stock
        )
        
        # Calcular cantidad sugerida de reorden
        if needs_reorder:
            # Stock objetivo: cubrir demanda predicha + stock de seguridad
            safety_stock = max_daily_demand * 7  # 7 días de stock de seguridad
            target_stock = total_predicted_demand + safety_stock
            suggested_order = max(0, target_stock - current_stock)
        else:
            suggested_order = 0
        
        recommendation = {
            'product_id': product_id,
            'product_name': product.name,
            'current_stock': current_stock,
            'reorder_point': product.reorder_point,
            'predicted_demand_total': round(total_predicted_demand, 2),
            'predicted_demand_avg_daily': round(avg_daily_demand, 2),
            'predicted_demand_max_daily': round(max_daily_demand, 2),
            'days_of_stock_available': round(days_of_stock, 1),
            'needs_reorder': needs_reorder,
            'suggested_order_quantity': round(suggested_order, 2),
            'priority': self.calculate_priority(needs_reorder, days_of_stock, current_stock, product.reorder_point)
        }
        
        return recommendation
    
    def calculate_priority(self, needs_reorder, days_of_stock, current_stock, reorder_point):
        """Calcula la prioridad de reorden"""
        if not needs_reorder:
            return 'LOW'
        
        if current_stock <= 0:
            return 'CRITICAL'
        elif days_of_stock <= 3:
            return 'HIGH'
        elif current_stock <= reorder_point:
            return 'MEDIUM'
        else:
            return 'LOW'
    
    def batch_reorder_recommendations(self, product_ids=None, days_ahead=30):
        """Genera recomendaciones de reorden para múltiples productos"""
        if product_ids is None:
            # Obtener todos los productos activos
            product_ids = list(Product.objects.filter(is_active=True).values_list('id', flat=True))
        
        recommendations = []
        
        print(f"Generando recomendaciones para {len(product_ids)} productos...")
        
        for i, product_id in enumerate(product_ids, 1):
            try:
                recommendation = self.generate_reorder_recommendations(product_id, days_ahead)
                recommendations.append(recommendation)
                
                if i % 10 == 0:
                    print(f"  Procesados {i}/{len(product_ids)} productos")
                    
            except Exception as e:
                print(f"Error procesando producto {product_id}: {str(e)}")
        
        # Ordenar por prioridad
        priority_order = {'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3}
        recommendations.sort(key=lambda x: priority_order.get(x['priority'], 4))
        
        print(f"✓ Recomendaciones generadas para {len(recommendations)} productos")
        
        return recommendations
    
    def get_model_info(self):
        """Retorna información del modelo cargado"""
        if self.model is None:
            return "No hay modelo cargado"
        
        return {
            'model_name': self.model_name,
            'features_count': len(self.feature_names),
            'features': self.feature_names,
            'model_type': type(self.model).__name__
        }