# Archivo: minimarket_ml_system/backend/apps/ml_models/management/commands/train_models.py

from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.ml_models.data_processor import DataProcessor
from apps.ml_models.trainer import MLTrainer
from apps.ml_models.models import MLModel, ModelPerformance
from django.contrib.auth.models import User
import os
import json

class Command(BaseCommand):
    help = 'Entrena modelos de Machine Learning para predicción de demanda'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days-back',
            type=int,
            default=730,
            help='Días de datos históricos a usar (default: 730)'
        )
        parser.add_argument(
            '--test-size',
            type=float,
            default=0.2,
            help='Proporción de datos para testing (default: 0.2)'
        )
        parser.add_argument(
            '--save-model',
            action='store_true',
            help='Guardar el mejor modelo entrenado'
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('=== ENTRENAMIENTO DE MODELOS ML ===')
        )
        
        try:
            # 1. Procesar datos
            self.stdout.write('PASO 1: Procesando datos históricos...')
            data_processor = DataProcessor()
            df = data_processor.process_complete_dataset(
                days_back=options['days_back']
            )
            
            if df.empty:
                self.stdout.write(
                    self.style.ERROR('No hay datos suficientes para entrenar')
                )
                return
            
            # 2. Preparar características y target
            self.stdout.write('PASO 2: Preparando características y target...')
            X, y = data_processor.prepare_features_target(df)
            
            if len(X) < 100:
                self.stdout.write(
                    self.style.WARNING(f'Pocos datos para entrenar: {len(X)} muestras')
                )
            
            # 3. Entrenar modelos
            self.stdout.write('PASO 3: Entrenando modelos de Machine Learning...')
            trainer = MLTrainer(data_processor)
            
            best_model, best_model_name, results = trainer.train_all_models(
                X, y, test_size=options['test_size']
            )
            
            # 4. Guardar modelo si se solicita
            if options['save_model']:
                self.stdout.write('PASO 4: Guardando modelo...')
                
                model_path = trainer.save_model()
                
                # Guardar información en la base de datos
                try:
                    admin_user = User.objects.filter(is_superuser=True).first()
                    
                    # Obtener métricas del mejor modelo
                    best_metrics = trainer.metrics[best_model_name]
                    
                    ml_model = MLModel.objects.create(
                        name=f"{best_model_name}_demand_prediction",
                        model_type=best_model_name.upper(),
                        version="1.0",
                        description=f"Modelo de predicción de demanda entrenado con {len(X)} muestras",
                        model_file=model_path,
                        parameters=json.dumps({
                            'test_size': options['test_size'],
                            'features_count': len(trainer.feature_names),
                            'training_samples': len(X)
                        }),
                        metrics=json.dumps(best_metrics['test_metrics']),
                        training_data_size=len(X),
                        is_active=True,
                        is_default=True,
                        created_by=admin_user
                    )
                    
                    self.stdout.write(
                        self.style.SUCCESS(f'✓ Modelo guardado en BD: {ml_model.id}')
                    )
                    
                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(f'Error guardando en BD: {str(e)}')
                    )
            
            # 5. Mostrar resumen final
            self.stdout.write('\n' + '='*50)
            self.stdout.write('ENTRENAMIENTO COMPLETADO EXITOSAMENTE')
            self.stdout.write('='*50)
            
            summary = trainer.create_model_summary()
            
            self.stdout.write(f"Mejor modelo: {summary['best_model']}")
            self.stdout.write(f"Modelos entrenados: {summary['total_models_trained']}")
            self.stdout.write(f"Características: {summary['feature_count']}")
            
            if 'best_metrics' in summary:
                metrics = summary['best_metrics']
                self.stdout.write(f"MAE: {metrics.get('MAE', 'N/A')}")
                self.stdout.write(f"RMSE: {metrics.get('RMSE', 'N/A')}")
                self.stdout.write(f"MAPE: {metrics.get('MAPE', 'N/A')}%")
                self.stdout.write(f"R²: {metrics.get('R2', 'N/A')}")
            
            # 6. Mostrar importancia de características si está disponible
            feature_importance = trainer.get_feature_importance()
            if feature_importance is not None:
                self.stdout.write('\nTop 10 características más importantes:')
                for i, row in feature_importance.head(10).iterrows():
                    self.stdout.write(f"  {row['feature']}: {row['importance']:.4f}")
            
            self.stdout.write(
                self.style.SUCCESS('\n¡Entrenamiento completado exitosamente!')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error durante el entrenamiento: {str(e)}')
            )
            raise