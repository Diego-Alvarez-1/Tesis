@echo off
echo ======================================
echo  INICIANDO FRONTEND - REACT SERVER
echo ======================================
cd /d "%~dp0..\frontend"
echo Iniciando servidor React en puerto 3000...
echo Presiona Ctrl+C para detener el servidor
echo ======================================
npm start
pause