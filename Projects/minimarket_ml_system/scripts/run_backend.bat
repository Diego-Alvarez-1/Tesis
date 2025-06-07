@echo off
echo ======================================
echo  INICIANDO BACKEND - DJANGO SERVER
echo ======================================
cd /d "%~dp0..\backend"
echo Activando entorno virtual...
call ..\venv\Scripts\activate.bat
echo Iniciando servidor Django en puerto 8000...
echo Presiona Ctrl+C para detener el servidor
echo ======================================
python manage.py runserver 8000
pause