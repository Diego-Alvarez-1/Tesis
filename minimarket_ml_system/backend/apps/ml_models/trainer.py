# Archivo: minimarket_ml_system/backend/apps/ml_models/trainer.py

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, TimeSeriesSplit, cross_val_score
from sklearn.preprocessing import StandardScaler, RobustScaler
from sklearn.ensemble import RandomForestRegressor
from sklearn.tree import DecisionTreeRegressor
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
import joblib
import os
from datetime import datetime, timedelta
import warnings
warnings.filterwarnings('ignore')

class MLTrainer:
    """Clase para entrenar modelos de Machine Learning"""
    
    def __init__(self, data_processor=None):
        self.data_processor = data_processor
        self.models = {}
        self.best_model = None
        self.best_model_name = None
        self.scalers = {}
        self.feature_names = []
        self.metrics = {}
        
    def prepare_models(self):
        """Inicializa los modelos a entrenar"""
        print("Preparando modelos de Machine Learning...")
        
        self.models = {
            'linear_regression': Pipeline([
                ('scaler', StandardScaler()),
                ('regressor', LinearRegression())
            ]),
            
            'ridge': Pipeline([
                ('scaler', StandardScaler()),
                ('regressor', Ridge(alpha=1.0, random_state=42))
            ]),
            
            'lasso': Pipeline([
                ('scaler', StandardScaler()),
                ('regressor', Lasso(alpha=0.1, random_state=42, max_iter=2000))
            ]),
            
            'decision_tree': Pipeline([
                ('scaler', RobustScaler()),
                ('regressor', DecisionTreeRegressor(
                    max_depth=10,
                    min_samples_split=10,
                    min_samples_leaf=5,
                    random_state=42
                ))
            ]),
            
            'random_forest': Pipeline([
                ('scaler', RobustScaler()),
                ('regressor', RandomForestRegressor(
                    n_estimators=100,
                    max_depth=15,
                    min_samples_split=10,
                    min_samples_leaf=5,
                    random_state=42,
                    n_jobs=-1
                ))
            ])
        }
        
        print(f"✓ {len(self.models)} modelos preparados")
    
    def calculate_metrics(self, y_true, y_pred):
        """Calcula métricas de evaluación"""
        mae = mean_absolute_error(y_true, y_pred)
        rmse = np.sqrt(mean_squared_error(y_true, y_pred))
        
        # Evitar división por cero para MAPE
        mask = y_true != 0
        if mask.any():
            mape = np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100
        else:
            mape = 0
        
        r2 = r2_score(y_true, y_pred)
        
        return {
            'MAE': round(mae, 4),
            'RMSE': round(rmse, 4),
            'MAPE': round(mape, 2),
            'R2': round(r2, 4)
        }
    
    def time_series_split_validation(self, X, y, model, n_splits=3):
        """Validación específica para series temporales"""
        tscv = TimeSeriesSplit(n_splits=n_splits)
        scores = []
        
        try:
            for train_idx, val_idx in tscv.split(X):
                X_train_fold, X_val_fold = X.iloc[train_idx], X.iloc[val_idx]
                y_train_fold, y_val_fold = y.iloc[train_idx], y.iloc[val_idx]
                
                # Crear copia del modelo para este fold
                from sklearn.base import clone
                model_fold = clone(model)
                model_fold.fit(X_train_fold, y_train_fold)
                
                # Predecir
                y_pred_fold = model_fold.predict(X_val_fold)
                
                # Calcular MAE para este fold
                mae = mean_absolute_error(y_val_fold, y_pred_fold)
                scores.append(mae)
            
            return np.mean(scores), np.std(scores)
        except Exception as e:
            print(f"Error en validación cruzada: {e}")
            return 0, 0
    
    def train_single_model(self, model_name, model, X_train, X_test, y_train, y_test):
        """Entrena un modelo individual"""
        print(f"\nEntrenando {model_name}...")
        start_time = datetime.now()
        
        try:
            # Verificar que los datos no están vacíos
            if len(X_train) == 0 or len(y_train) == 0:
                raise ValueError("Datos de entrenamiento vacíos")
            
            # Entrenar modelo
            model.fit(X_train, y_train)
            
            # Predicciones
            y_train_pred = model.predict(X_train)
            y_test_pred = model.predict(X_test)
            
            # Métricas de entrenamiento
            train_metrics = self.calculate_metrics(y_train, y_train_pred)
            
            # Métricas de prueba
            test_metrics = self.calculate_metrics(y_test, y_test_pred)
            
            # Tiempo de entrenamiento
            training_time = datetime.now() - start_time
            
            # Validación cruzada temporal (solo si hay suficientes datos)
            if len(X_train) > 200:
                cv_score, cv_std = self.time_series_split_validation(
                    X_train, y_train, model, n_splits=3
                )
            else:
                cv_score, cv_std = 0, 0
            
            metrics = {
                'model_name': model_name,
                'train_metrics': train_metrics,
                'test_metrics': test_metrics,
                'cv_score': round(cv_score, 4),
                'cv_std': round(cv_std, 4),
                'training_time': training_time.total_seconds(),
                'model': model
            }
            
            print(f"✓ {model_name} entrenado exitosamente")
            print(f"  MAE Test: {test_metrics['MAE']}")
            print(f"  RMSE Test: {test_metrics['RMSE']}")
            print(f"  MAPE Test: {test_metrics['MAPE']}%")
            print(f"  R² Test: {test_metrics['R2']}")
            
            return metrics
            
        except Exception as e:
            print(f"✗ Error entrenando {model_name}: {str(e)}")
            return None
    
    def train_all_models(self, X, y, test_size=0.2, random_state=42):
        """Entrena todos los modelos y selecciona el mejor"""
        print("=" * 60)
        print("INICIANDO ENTRENAMIENTO DE MODELOS ML")
        print("=" * 60)
        
        if X is None or y is None:
            raise ValueError("Datos de entrada no válidos")
        
        if len(X) == 0 or len(y) == 0:
            raise ValueError("Los datos de entrada están vacíos")
        
        # Preparar modelos
        self.prepare_models()
        
        # Guardar nombres de características
        self.feature_names = list(X.columns)
        
        # Verificar que tenemos suficientes datos
        if len(X) < 100:
            print(f"⚠️ Advertencia: Pocos datos para entrenamiento ({len(X)} muestras)")
        
        # Dividir datos manteniendo orden temporal
        # Para series temporales, usamos las últimas fechas como test
        split_idx = int(len(X) * (1 - test_size))
        X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
        y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
        
        print(f"Datos de entrenamiento: {len(X_train)} muestras")
        print(f"Datos de prueba: {len(X_test)} muestras")
        print(f"Características: {len(self.feature_names)}")
        
        # Verificar que tenemos datos de prueba
        if len(X_test) == 0:
            print("⚠️ No hay datos de prueba, usando validación simple")
            # Usar una muestra pequeña del final para testing
            test_samples = max(1, len(X_train) // 10)
            X_test = X_train.iloc[-test_samples:]
            y_test = y_train.iloc[-test_samples:]
            X_train = X_train.iloc[:-test_samples]
            y_train = y_train.iloc[:-test_samples]
        
        # Entrenar cada modelo
        results = []
        successful_models = 0
        
        for model_name, model in self.models.items():
            result = self.train_single_model(
                model_name, model, X_train, X_test, y_train, y_test
            )
            if result:
                results.append(result)
                self.metrics[model_name] = result
                successful_models += 1
        
        if not results:
            raise Exception("No se pudo entrenar ningún modelo exitosamente")
        
        print(f"\n✓ {successful_models}/{len(self.models)} modelos entrenados exitosamente")
        
        # Seleccionar mejor modelo basado en MAE de test
        best_result = min(results, key=lambda x: x['test_metrics']['MAE'])
        self.best_model = best_result['model']
        self.best_model_name = best_result['model_name']
        
        print("\n" + "=" * 60)
        print("RESULTADOS DEL ENTRENAMIENTO")
        print("=" * 60)
        
        # Mostrar comparación de modelos
        print(f"{'Modelo':<20} {'MAE Test':<10} {'RMSE Test':<12} {'MAPE Test':<12} {'R² Test':<10}")
        print("-" * 70)
        
        for result in sorted(results, key=lambda x: x['test_metrics']['MAE']):
            metrics = result['test_metrics']
            print(f"{result['model_name']:<20} {metrics['MAE']:<10.4f} "
                  f"{metrics['RMSE']:<12.4f} {metrics['MAPE']:<12.2f}% "
                  f"{metrics['R2']:<10.4f}")
        
        print("\n" + "=" * 60)
        print(f"🏆 MEJOR MODELO: {self.best_model_name}")
        best_metrics = best_result['test_metrics']
        print(f"   MAE: {best_metrics['MAE']}")
        print(f"   RMSE: {best_metrics['RMSE']}")
        print(f"   MAPE: {best_metrics['MAPE']}%")
        print(f"   R²: {best_metrics['R2']}")
        print("=" * 60)
        
        return self.best_model, self.best_model_name, results
    
    def save_model(self, model_path='data/models'):
        """Guarda el mejor modelo entrenado"""
        if self.best_model is None:
            raise ValueError("No hay modelo entrenado para guardar")
        
        # Crear directorio si no existe
        os.makedirs(model_path, exist_ok=True)
        
        # Nombre del archivo
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{self.best_model_name}_{timestamp}.joblib"
        filepath = os.path.join(model_path, filename)
        
        # Preparar datos para guardar
        model_data = {
            'model': self.best_model,
            'model_name': self.best_model_name,
            'feature_names': self.feature_names,
            'metrics': self.metrics[self.best_model_name] if self.best_model_name in self.metrics else {},
            'training_date': datetime.now(),
            'version': '1.0'
        }
        
        # Guardar
        joblib.dump(model_data, filepath)
        
        print(f"✓ Modelo guardado en: {filepath}")
        return filepath
    
    def load_model(self, filepath):
        """Carga un modelo guardado"""
        try:
            model_data = joblib.load(filepath)
            
            self.best_model = model_data['model']
            self.best_model_name = model_data['model_name']
            self.feature_names = model_data['feature_names']
            
            print(f"✓ Modelo cargado: {self.best_model_name}")
            return True
            
        except Exception as e:
            print(f"Error cargando modelo: {str(e)}")
            return False
    
    def predict(self, X):
        """Realiza predicciones con el mejor modelo"""
        if self.best_model is None:
            raise ValueError("No hay modelo entrenado")
        
        # Verificar que las características coincidan
        if list(X.columns) != self.feature_names:
            print("Advertencia: Las características no coinciden exactamente")
            # Intentar reordenar columnas
            try:
                X = X[self.feature_names]
            except KeyError as e:
                raise ValueError(f"Características faltantes: {e}")
        
        predictions = self.best_model.predict(X)
        
        # Asegurar que las predicciones no sean negativas
        predictions = np.maximum(predictions, 0)
        
        return predictions
    
    def get_feature_importance(self):
        """Obtiene la importancia de características del mejor modelo"""
        if self.best_model is None:
            return None
        
        # Extraer el modelo base del pipeline
        try:
            model = self.best_model.named_steps['regressor']
            
            if hasattr(model, 'feature_importances_'):
                importance = model.feature_importances_
                feature_importance = pd.DataFrame({
                    'feature': self.feature_names,
                    'importance': importance
                }).sort_values('importance', ascending=False)
                
                return feature_importance
            
            elif hasattr(model, 'coef_'):
                # Para modelos lineales, usar valor absoluto de coeficientes
                importance = np.abs(model.coef_)
                feature_importance = pd.DataFrame({
                    'feature': self.feature_names,
                    'importance': importance
                }).sort_values('importance', ascending=False)
                
                return feature_importance
        except Exception as e:
            print(f"Error obteniendo importancia: {e}")
        
        return None
    
    def create_model_summary(self):
        """Crea un resumen del entrenamiento"""
        if not self.metrics:
            return "No hay métricas disponibles"
        
        summary = {
            'best_model': self.best_model_name,
            'total_models_trained': len(self.metrics),
            'best_metrics': self.metrics[self.best_model_name]['test_metrics'] if self.best_model_name in self.metrics else {},
            'feature_count': len(self.feature_names),
            'training_date': datetime.now().isoformat(),
            'models_comparison': {
                name: metrics['test_metrics'] 
                for name, metrics in self.metrics.items()
            }
        }
        
        return summary