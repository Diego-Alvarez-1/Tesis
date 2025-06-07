# Scripts de Automatización

## Scripts Disponibles

### Configuración Inicial
- `setup_backend.bat` - Configura el backend Django
- `setup_frontend.bat` - Configura el frontend React
- `setup_project.bat` - Configuración completa del proyecto

### Ejecución
- `run_backend.bat` - Inicia el servidor Django (puerto 8000)
- `run_frontend.bat` - Inicia el servidor React (puerto 3000)

### Administración
- `create_superuser.bat` - Crea superusuario de Django
- `reset_database.bat` - Resetea la base de datos

## Uso

### Primera vez (configuración)
1. Ejecutar `setup_project.bat`
2. Ejecutar `create_superuser.bat`

### Uso diario
1. Abrir una terminal y ejecutar `run_backend.bat`
2. Abrir otra terminal y ejecutar `run_frontend.bat`

## URLs del Sistema
- Backend Admin: http://127.0.0.1:8000/admin/
- Backend API: http://127.0.0.1:8000/api/
- Frontend: http://localhost:3000/

# Crear el README de scripts
@"
# Scripts de Automatización

## Scripts Disponibles

### Configuración Inicial
- setup_backend.bat - Configura el backend Django
- setup_frontend.bat - Configura el frontend React
- setup_project.bat - Configuración completa del proyecto

### Ejecución
- run_backend.bat - Inicia el servidor Django (puerto 8000)
- run_frontend.bat - Inicia el servidor React (puerto 3000)

### Administración
- create_superuser.bat - Crea superusuario de Django
- reset_database.bat - Resetea la base de datos

## Uso

### Primera vez (configuración)
1. Ejecutar setup_project.bat
2. Ejecutar create_superuser.bat

### Uso diario
1. Abrir una terminal y ejecutar run_backend.bat
2. Abrir otra terminal y ejecutar run_frontend.bat

## URLs del Sistema
- Backend Admin: http://127.0.0.1:8000/admin/
- Backend API: http://127.0.0.1:8000/api/
- Frontend: http://localhost:3000/
"@ | Out-File -FilePath "scripts\README.md" -Encoding UTF8