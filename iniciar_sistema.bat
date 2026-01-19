@echo off
echo ==========================================
echo   Iniciando Sistema G10 Araquari Backend
echo ==========================================
echo.
echo Verificando dependencias...
cd backend
if not exist node_modules (
    echo Instalando dependencias do backend...
    call npm install
) else (
    echo Dependencias ja instaladas.
)

echo.
echo Iniciando servidor...
echo O sistema estara disponivel em: http://localhost:5000
echo.
echo Pressione CTRL+C para parar o servidor.
echo.

start "" "http://localhost:5000/pages/utilitarios/CalendarioFolgas/index.html"
node server.js
pause
