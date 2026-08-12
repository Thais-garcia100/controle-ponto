@echo off
setlocal
chcp 65001 >nul
title Controle de Ponto - acesso pelo celular

set "PORT=8080"
set "APP=controle-ponto.html"

where python >nul 2>nul
if %errorlevel%==0 (
  set "PYTHON_CMD=python"
) else (
  where py >nul 2>nul
  if %errorlevel%==0 (
    set "PYTHON_CMD=py -3"
  ) else (
    echo Python nao foi encontrado neste computador.
    echo Instale o Python ou abra o arquivo controle-ponto.html direto no navegador.
    pause
    exit /b 1
  )
)

for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -First 1 -ExpandProperty IPAddress)"`) do set "LOCAL_IP=%%i"

if "%LOCAL_IP%"=="" (
  for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /c:"IPv4"') do (
    if "%LOCAL_IP%"=="" set "LOCAL_IP=%%i"
  )
  set "LOCAL_IP=%LOCAL_IP: =%"
)

echo.
echo Controle de Ponto pronto para celular.
echo.
echo No celular, conecte na mesma rede Wi-Fi deste computador e abra:
echo.
echo   http://%LOCAL_IP%:%PORT%/%APP%
echo.
echo Se o Windows perguntar, permita o acesso do Python na rede privada.
echo Para encerrar, feche esta janela.
echo.

%PYTHON_CMD% -m http.server %PORT% --bind 0.0.0.0 --directory "%~dp0"
