@echo off
echo ======================================
echo  CONFIGURACION FRONTEND
echo ======================================
cd /d "%~dp0..\frontend"
echo Instalando dependencias de Node.js...
npm install
echo ======================================
echo Frontend configurado correctamente!
echo ======================================
pause