@echo off
echo ======================================
echo  CREAR SUPERUSUARIO DJANGO
echo ======================================
cd /d "%~dp0..\backend"
call ..\venv\Scripts\activate.bat
echo Creando superusuario para el admin...
echo.
echo Datos sugeridos:
echo Username: admin
echo Email: admin@minimarket.com
echo Password: admin123
echo.
python manage.py createsuperuser
echo.
echo Superusuario creado!
echo Accede en: http://127.0.0.1:8000/admin/
pause