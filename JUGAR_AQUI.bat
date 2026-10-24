@echo off
title Servidor Local - Silent Asylum Horror Game
cd /d "%~dp0"
echo ==============================================================
echo       INICIANDO SILENT ASYLUM (JUEGO DE TERROR INDIE 3D)
echo ==============================================================
echo Iniciando servidor en http://localhost:8000/ ...
echo El juego se abrira automaticamente en tu navegador web.
echo.
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0server.ps1"
pause
