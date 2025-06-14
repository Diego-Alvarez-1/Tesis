# Archivo: minimarket_ml_system/backend/apps/ml_models/management/commands/predict_demand.py

from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.ml_models.predictor import DemandPredictor
from apps.ml_models.models import DemandPrediction, PredictionRequest
from apps.products.models import Product
from django.contrib.auth.models import User
from datetime import datetime, timedelta
import pandas as pd

class Command(BaseCommand):
    help = 'Genera predicciones de demanda para productos'

    def add_arguments(self, parser):
        parser.add_argument(
            '--product-id',
            type=int,
            help='ID del producto específico (opcional)'
        )
        parser.add_argument(
            '--days-ahead',
            type=int,
            default=30,
            help='Días hacia adelante para predecir (default: 30)'
        )
        parser.add_argument(
            '--start-date',
            type=str,
            help='Fecha de inicio para predicción (YYYY-MM-DD, default: mañana)'
        )
        parser.add_argument(
            '--save-db',
            action='store_true',
            help='Guardar predicciones en la base de datos'
        )
        parser.add_argument(
            '--top-products',
            type=int,
            default=10,
            help='Número de productos top para predecir (default: 10)'
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('=== PREDICCIÓN DE DEMANDA ===')
        )
        
        try:
            # Inicializar predictor
            predictor = DemandPredictor()
            
            # Cargar modelo
            if not predictor.load_model():
                self.stdout.write(
                    self.style.ERROR('No se pudo cargar el modelo. Ejecute primero: python manage.py train_models --save-model')
                )
                return
            
            # Configurar fechas
            if options['start_date']:
                start_date = datetime.strptime(options['start_date'], '%Y-%m-%d').date()
            else:
                start_date = (datetime.now() + timedelta(days=1)).date()
            
            days_ahead = options['days_ahead']
            
            # Determinar productos a predecir
            if options['product_id']:
                product_ids = [options['product_id']]
                self.stdout.write(f'Prediciendo para producto específico: {options["product_id"]}')
            else:
                # Obtener top productos por ventas
                from django.db.models import Sum
                from apps.sales.models import SaleItem
                
                top_products = SaleItem.objects.filter(
                    sale__sale_date__gte=datetime.now() - timedelta(days=90),
                    sale__status='COMPLETED'
                ).values('product_id').annotate(
                    total_sold=Sum('quantity')
                ).order_by('-total_sold')[:options['top_products']]
                
                product_ids = [item['product_id'] for item in top_products]
                self.stdout.write(f'Prediciendo para top {len(product_ids)} productos por ventas')
            
            # Realizar predicciones
            self.stdout.write(f'Generando predicciones desde {start_date} por {days_ahead} días...')
            
            all_predictions = []
            successful_predictions = 0
            
            for i, product_id in enumerate(product_ids, 1):
                try:
                    product = Product.objects.get(id=product_id)
                    self.stdout.write(f'[{i}/{len(product_ids)}] Prediciendo: {product.name}')
                    
                    # Generar predicción
                    prediction_df = predictor.predict_demand(
                        product_id=product_id,
                        start_date=start_date,
                        days_ahead=days_ahead
                    )
                    
                    prediction_df['product_id'] = product_id
                    prediction_df['product_name'] = product.name
                    all_predictions.append(prediction_df)
                    successful_predictions += 1
                    
                    # Mostrar resumen
                    total_predicted = prediction_df['predicted_quantity'].sum()
                    avg_daily = prediction_df['predicted_quantity'].mean()
                    
                    self.stdout.write(
                        f'  ✓ Total predicho: {total_predicted:.2f}, Promedio diario: {avg_daily:.2f}'
                    )
                    
                    # Guardar en base de datos si se solicita
                    if options['save_db']:
                        self.save_predictions_to_db(product_id, prediction_df, predictor)
                    
                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(f'  ✗ Error en producto {product_id}: {str(e)}')
                    )
                    continue
            
            # Mostrar resumen final
            self.stdout.write('\n' + '='*50)
            self.stdout.write('PREDICCIONES COMPLETADAS')
            self.stdout.write('='*50)
            self.stdout.write(f'Productos procesados exitosamente: {successful_predictions}/{len(product_ids)}')
            
            if all_predictions:
                # Combinar todas las predicciones
                combined_df = pd.concat(all_predictions, ignore_index=True)
                
                # Estadísticas generales
                total_demand = combined_df['predicted_quantity'].sum()
                avg_demand = combined_df['predicted_quantity'].mean()
                
                self.stdout.write(f'Demanda total predicha: {total_demand:.2f}')
                self.stdout.write(f'Demanda promedio diaria: {avg_demand:.2f}')
                
                # Top productos por demanda predicha
                top_demand = combined_df.groupby(['product_id', 'product_name'])['predicted_quantity'].sum().sort_values(ascending=False).head(5)
                
                self.stdout.write('\nTop 5 productos por demanda predicha:')
                for (product_id, product_name), demand in top_demand.items():
                    self.stdout.write(f'  {product_name}: {demand:.2f}')
                
                # Generar recomendaciones de reorden
                self.stdout.write('\nGenerando recomendaciones de reorden...')
                recommendations = []
                
                for product_id in product_ids[:5]:  # Solo para los primeros 5 productos
                    try:
                        rec = predictor.generate_reorder_recommendations(product_id, days_ahead)
                        recommendations.append(rec)
                    except Exception as e:
                        self.stdout.write(f'Error generando recomendación para {product_id}: {str(e)}')
                
                if recommendations:
                    self.stdout.write('\nRecomendaciones de reorden (Top 5):')
                    for rec in sorted(recommendations, key=lambda x: {'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3}.get(x['priority'], 4)):
                        priority_color = {
                            'CRITICAL': self.style.ERROR,
                            'HIGH': self.style.WARNING,
                            'MEDIUM': self.style.NOTICE,
                            'LOW': self.style.SUCCESS
                        }.get(rec['priority'], str)
                        
                        self.stdout.write(
                            f"  {priority_color(rec['priority'])}: {rec['product_name']} - "
                            f"Stock: {rec['current_stock']}, Sugerir: {rec['suggested_order_quantity']:.0f}"
                        )
            
            self.stdout.write(
                self.style.SUCCESS('\n¡Predicciones completadas exitosamente!')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error durante la predicción: {str(e)}')
            )
            raise
    
    def save_predictions_to_db(self, product_id, prediction_df, predictor):
        """Guarda las predicciones en la base de datos"""
        try:
            # Obtener o crear request de predicción
            admin_user = User.objects.filter(is_superuser=True).first()
            
            prediction_request = PredictionRequest.objects.create(
                product_id=product_id,
                user=admin_user,
                prediction_days=len(prediction_df),
                input_data={'model_used': predictor.model_name},
                prediction_result={'total_predicted': float(prediction_df['predicted_quantity'].sum())},
                completed_at=timezone.now()
            )
            
            # Guardar predicciones diarias
            predictions_to_create = []
            
            for _, row in prediction_df.iterrows():
                predictions_to_create.append(
                    DemandPrediction(
                        product_id=product_id,
                        prediction_request=prediction_request,
                        prediction_date=row['date'].date(),
                        prediction_period='DAILY',
                        predicted_quantity=row['predicted_quantity'],
                        lower_bound=row.get('lower_bound', 0),
                        upper_bound=row.get('upper_bound', row['predicted_quantity'] * 1.2)
                    )
                )
            
            # Bulk create para mejor performance
            DemandPrediction.objects.bulk_create(predictions_to_create, batch_size=100)
            
            self.stdout.write(f'  ✓ {len(predictions_to_create)} predicciones guardadas en BD')
            
        except Exception as e:
            self.stdout.write(f'  ✗ Error guardando en BD: {str(e)}')