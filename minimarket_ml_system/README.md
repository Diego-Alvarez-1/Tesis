# Sistema de Gestión Logística con Machine Learning

**Universidad Católica de Santa María**  
**Facultad de Ciencias e Ingenierías Físicas y Formales**  
**Escuela Profesional de Ingeniería de Sistemas**

## Descripción del Proyecto

Sistema web para optimizar el abastecimiento de productos en un mini market del distrito de Mariano Melgar, Arequipa, utilizando algoritmos de Machine Learning para la predicción de demanda.

## Tecnologías Utilizadas

### Backend
- **Python 3.9+**
- **Django 4.2** - Framework web
- **Django REST Framework** - API REST
- **SQLite** - Base de datos (desarrollo)
- **scikit-learn** - Machine Learning
- **pandas, numpy** - Análisis de datos
- **matplotlib, seaborn** - Visualizaciones

### Frontend
- **React 18** - Framework de interfaz
- **Material-UI** - Componentes de UI
- **React Router** - Navegación
- **Chart.js** - Gráficos
- **Axios** - Cliente HTTP

## Estructura del Proyecto
minimarket_ml_system/
├── backend/                 # API Django
│   ├── config/             # Configuración Django
│   ├── apps/               # Aplicaciones del sistema
│   │   ├── products/       # Gestión de productos
│   │   ├── inventory/      # Control de inventario
│   │   ├── sales/          # Registro de ventas
│   │   ├── ml_models/      # Modelos de ML
│   │   └── analytics/      # Analytics y reportes
│   ├── data/               # Datos y modelos ML
│   ├── static/             # Archivos estáticos
│   └── media/              # Archivos multimedia
├── frontend/               # Aplicación React
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── pages/          # Páginas principales
│   │   ├── services/       # Servicios API
│   │   └── utils/          # Utilidades
│   └── public/             # Archivos públicos
├── scripts/                # Scripts de automatización
├── docs/                   # Documentación
└── venv/                   # Entorno virtual Python