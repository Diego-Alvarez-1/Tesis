@echo off
echo ======================================
echo  CONFIGURACION COMPLETA DEL PROYECTO
echo  Sistema de Gestion Logistica con ML
echo ======================================
echo.

echo PASO 1: Configurando Backend (Django)...
cd /d "%~dp0..\backend"
call ..\venv\Scripts\activate.bat
pip install -r requirements.txt
python manage.py makemigrations
python manage.py migrate
echo Backend configurado!
echo.

echo PASO 2: Configurando Frontend (React)...
cd ..\frontend
npm install
echo Frontend configurado!
echo.

echo ======================================
echo  CONFIGURACION COMPLETADA!
echo ======================================
echo.
echo Para iniciar el proyecto:
echo 1. Backend: ejecutar scripts\run_backend.bat
echo 2. Frontend: ejecutar scripts\run_frontend.bat
echo.
echo URLs del sistema:
echo - Backend Admin: http://127.0.0.1:8000/admin/
echo - Backend API: http://127.0.0.1:8000/api/
echo - Frontend: http://localhost:3000/
echo.
pause