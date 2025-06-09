@echo off
echo ======================================
echo  RESET BASE DE DATOS
echo ======================================
echo.
echo ADVERTENCIA: Esto eliminara todos los datos!
echo.
set /p confirm=¿Estas seguro? (y/N): 
if /i "%confirm%" neq "y" (
    echo Operacion cancelada.
    pause
    exit /b
)

cd /d "%~dp0..\backend"
call ..\venv\Scripts\activate.bat

echo Eliminando base de datos...
if exist db.sqlite3 del db.sqlite3

echo Eliminando migraciones...
for /d %%i in (apps\*\migrations) do (
    if exist "%%i" (
        pushd "%%i"
        for %%f in (*.py) do (
            if not "%%f"=="__init__.py" del "%%f"
        )
        popd
    )
)

echo Creando nuevas migraciones...
python manage.py makemigrations
python manage.py migrate

echo Base de datos reseteada!
echo No olvides crear un nuevo superusuario.
pause