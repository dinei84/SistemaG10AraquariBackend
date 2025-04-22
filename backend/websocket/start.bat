@echo off
echo Iniciando servidor WebSocket...

cd %~dp0
node start-websocket.js

pause