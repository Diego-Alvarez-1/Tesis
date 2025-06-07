@echo off
echo ======================================
echo  CONFIGURACION BACKEND
echo ======================================
cd /d "%~dp0..\backend"
echo Activando entorno virtual...
call ..\venv\Scripts\activate.bat
echo Instalando dependencias...
pip install -r requirements.txt
echo Haciendo migraciones...
python manage.py makemigrations
python manage.py migrate
echo ======================================
echo Backend configurado correctamente!
echo ======================================
pause