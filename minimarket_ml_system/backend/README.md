# Backend - Sistema de Gestión Logística ML

## Estructura de Apps

- **products**: Gestión de productos del mini market
- **inventory**: Control de inventario y stock
- **sales**: Registro y seguimiento de ventas
- **ml_models**: Modelos de Machine Learning para predicción
- **analytics**: Análisis y reportes del sistema

## URLs de Testing

- API Root: `/api/`
- Products: `/api/products/test/`
- Inventory: `/api/inventory/test/`
- Sales: `/api/sales/test/`
- ML Models: `/api/ml/test/`
- Analytics: `/api/analytics/test/`

## Comandos Útiles

```bash
# Activar entorno
venv\Scripts\activate

# Migraciones
python manage.py makemigrations
python manage.py migrate

# Servidor
python manage.py runserver

# Superusuario
python manage.py createsuperuser