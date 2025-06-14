# Archivo: minimarket_ml_system/backend/check_stage3.py

import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db.models import Count
from apps.products.models import Product
from apps.sales.models import Sale, SaleItem
from apps.ml_models.models import MLModel, PredictionRequest, DemandPrediction
from apps.ml_models.data_processor import DataProcessor
from apps.ml_models.trainer import MLTrainer
from apps.ml_models.predictor import DemandPredictor
import requests

def check_stage3_completion():
    """Verifica que la Etapa 3 se haya completado correctamente"""
    print("=" * 60)
    print("VERIFICACIÓN DE ETAPA 3: MODELOS DE MACHINE LEARNING")
    print("=" * 60)
    
    checks = []
    
    # 1. Verificar archivos de ML creados
    print("\n1. VERIFICANDO ARCHIVOS DE MACHINE LEARNING:")
    print("-" * 50)
    
    ml_files = [
        'apps/ml_models/data_processor.py',
        'apps/ml_models/trainer.py',
        'apps/ml_models/predictor.py',
        'apps/ml_models/management/__init__.py',
        'apps/ml_models/management/commands/__init__.py',
        'apps/ml_models/management/commands/train_models.py',
        'apps/ml_models/management/commands/predict_demand.py',
        'apps/ml_models/serializers.py',
    ]
    
    ml_files_ok = True
    for file in ml_files:
        exists = os.path.exists(file)
        status = "✓" if exists else "✗"
        print(f"{status} {file}")
        if not exists:
            ml_files_ok = False
    
    checks.append(("Archivos ML creados", ml_files_ok))
    
    # 2. Verificar funcionalidad de DataProcessor
    print("\n2. VERIFICANDO DATA PROCESSOR:")
    print("-" * 50)
    
    try:
        processor = DataProcessor()
        
        # Verificar extracción de datos
        sales_data = processor.extract_sales_data(days_back=30)
        print(f"✓ Extracción de datos: {len(sales_data)} registros")
        
        # Verificar procesamiento básico
        if len(sales_data) > 0:
            processed_data = processor.create_time_series_features(sales_data.head(100))  # Muestra pequeña
            print(f"✓ Procesamiento temporal: {len(processed_data)} registros")
            processor_ok = True
        else:
            print("✗ No hay datos suficientes para procesar")
            processor_ok = False
            
    except Exception as e:
        print(f"✗ Error en DataProcessor: {str(e)}")
        processor_ok = False
    
    checks.append(("DataProcessor funcional", processor_ok))
    
    # 3. Verificar entrenamiento de modelos
    print("\n3. VERIFICANDO ENTRENAMIENTO DE MODELOS:")
    print("-" * 50)
    
    try:
        # Verificar que se pueden inicializar los trainers
        trainer = MLTrainer()
        trainer.prepare_models()
        print(f"✓ Trainer inicializado: {len(trainer.models)} modelos disponibles")
        
        # Listar modelos disponibles
        for model_name in trainer.models.keys():
            print(f"  - {model_name}")
        
        trainer_ok = True
        
    except Exception as e:
        print(f"✗ Error en MLTrainer: {str(e)}")
        trainer_ok = False
    
    checks.append(("MLTrainer funcional", trainer_ok))
    
    # 4. Verificar predictor
    print("\n4. VERIFICANDO PREDICTOR:")
    print("-" * 50)
    
    try:
        predictor = DemandPredictor()
        
        # Verificar que se puede inicializar
        print("✓ DemandPredictor inicializado")
        
        # Verificar búsqueda de modelos
        latest_model = predictor.find_latest_model()
        if latest_model:
            print(f"✓ Modelo encontrado: {latest_model}")
        else:
            print("ℹ No hay modelos entrenados (normal en primera ejecución)")
        
        predictor_ok = True
        
    except Exception as e:
        print(f"✗ Error en DemandPredictor: {str(e)}")
        predictor_ok = False
    
    checks.append(("DemandPredictor funcional", predictor_ok))
    
    # 5. Verificar comandos de gestión
    print("\n5. VERIFICANDO COMANDOS DE GESTIÓN:")
    print("-" * 50)
    
    # Verificar comando train_models
    train_cmd_exists = os.path.exists('apps/ml_models/management/commands/train_models.py')
    predict_cmd_exists = os.path.exists('apps/ml_models/management/commands/predict_demand.py')
    
    print(f"{'✓' if train_cmd_exists else '✗'} Comando train_models.py")
    print(f"{'✓' if predict_cmd_exists else '✗'} Comando predict_demand.py")
    
    commands_ok = train_cmd_exists and predict_cmd_exists
    checks.append(("Comandos de gestión", commands_ok))
    
    # 6. Verificar APIs REST
    print("\n6. VERIFICANDO APIs REST:")
    print("-" * 50)
    
    try:
        # Verificar que el servidor está corriendo
        response = requests.get('http://127.0.0.1:8000/api/ml/test/', timeout=5)
        if response.status_code == 200:
            print("✓ API ML funcionando")
            api_data = response.json()
            print(f"  Endpoints disponibles: {len(api_data.get('endpoints', {}))}")
            api_ok = True
        else:
            print(f"✗ API ML retornó código: {response.status_code}")
            api_ok = False
            
    except requests.exceptions.RequestException as e:
        print(f"✗ Error conectando a API: {str(e)}")
        print("  Asegúrese de que el servidor Django esté corriendo")
        api_ok = False
    
    checks.append(("APIs REST funcionando", api_ok))
    
    # 7. Verificar base de datos ML
    print("\n7. VERIFICANDO BASE DE DATOS ML:")
    print("-" * 50)
    
    # Contar registros en tablas ML
    ml_models_count = MLModel.objects.count()
    predictions_count = PredictionRequest.objects.count()
    demand_predictions_count = DemandPrediction.objects.count()
    
    print(f"MLModel: {ml_models_count} registros")
    print(f"PredictionRequest: {predictions_count} registros")
    print(f"DemandPrediction: {demand_predictions_count} registros")
    
    # Verificar que las tablas existen (aunque estén vacías)
    try:
        MLModel.objects.all()[:1]
        print("✓ Tablas ML creadas correctamente")
        db_ok = True
    except Exception as e:
        print(f"✗ Error en tablas ML: {str(e)}")
        db_ok = False
    
    checks.append(("Base de datos ML", db_ok))
    
    # 8. Verificar datos para entrenamiento
    print("\n8. VERIFICANDO DATOS PARA ENTRENAMIENTO:")
    print("-" * 50)
    
    # Verificar datos mínimos para ML
    products_count = Product.objects.filter(is_active=True).count()
    sales_count = Sale.objects.filter(status='COMPLETED').count()
    sale_items_count = SaleItem.objects.count()
    
    print(f"Productos activos: {products_count}")
    print(f"Ventas completadas: {sales_count}")
    print(f"Items de venta: {sale_items_count}")
    
    # Verificar que hay datos suficientes
    data_sufficient = products_count >= 10 and sales_count >= 100 and sale_items_count >= 500
    
    if data_sufficient:
        print("✓ Datos suficientes para entrenamiento")
    else:
        print("⚠ Datos insuficientes para entrenamiento óptimo")
        print("  Recomendación: Generar más datos históricos")
    
    checks.append(("Datos suficientes", data_sufficient))
    
    # 9. Verificar directorio de modelos
    print("\n9. VERIFICANDO DIRECTORIO DE MODELOS:")
    print("-" * 50)
    
    models_dir = 'data/models'
    models_dir_exists = os.path.exists(models_dir)
    
    if models_dir_exists:
        model_files = [f for f in os.listdir(models_dir) if f.endswith('.joblib')]
        print(f"✓ Directorio de modelos existe")
        print(f"  Modelos guardados: {len(model_files)}")
        for model_file in model_files:
            print(f"    - {model_file}")
    else:
        print(f"✓ Directorio de modelos será creado automáticamente")
    
    checks.append(("Directorio de modelos", True))  # Siempre OK, se crea automáticamente
    
    # 10. Resumen final
    print("\n" + "=" * 60)
    print("RESUMEN DE VERIFICACIÓN - ETAPA 3:")
    print("=" * 60)
    
    all_passed = True
    critical_checks = ['Archivos ML creados', 'DataProcessor funcional', 'MLTrainer funcional', 'DemandPredictor funcional']
    
    for check_name, passed in checks:
        status = "✓ COMPLETADO" if passed else "✗ PENDIENTE"
        priority = " (CRÍTICO)" if check_name in critical_checks and not passed else ""
        print(f"{status}: {check_name}{priority}")
        
        if check_name in critical_checks and not passed:
            all_passed = False
    
    print("\n" + "=" * 60)
    
    if all_passed:
        print("✅ ETAPA 3 COMPLETADA EXITOSAMENTE!")
        print("\n📋 PRÓXIMOS PASOS:")
        print("1. Entrenar primer modelo:")
        print("   python manage.py train_models --save-model")
        print("\n2. Generar predicciones:")
        print("   python manage.py predict_demand --save-db")
        print("\n3. Probar APIs:")
        print("   http://127.0.0.1:8000/api/ml/")
        print("\n4. Continuar con Etapa 4: Desarrollo del Backend (API REST)")
    else:
        print("⚠️ ETAPA 3 INCOMPLETA - Revise los items críticos pendientes")
        print("\n🔧 ACCIONES RECOMENDADAS:")
        print("1. Verificar que todos los archivos fueron creados correctamente")
        print("2. Revisar logs de errores en la consola")
        print("3. Asegurar que las dependencias están instaladas")
        print("4. Verificar que el servidor Django está corriendo")
    
    print("=" * 60)
    
    return all_passed

if __name__ == "__main__":
    check_stage3_completion()