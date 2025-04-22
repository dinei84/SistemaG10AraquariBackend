@echo off
echo ===================================================
echo    Iniciando o servidor em modo de desenvolvimento
echo ===================================================
echo.

echo Verificando se o Node.js esta instalado...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo ERRO: Node.js nao encontrado! Por favor, instale o Node.js.
  echo Visite https://nodejs.org para baixar e instalar.
  echo.
  pause
  exit /b 1
)

echo Node.js encontrado! Iniciando o servidor...
echo.

node start-dev.js

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo ERRO: Ocorreu um problema ao iniciar o servidor.
  echo Verifique as mensagens de erro acima.
  echo.
)

pause