#!/bin/bash

# Script de build para o deploy no Render

echo "Iniciando processo de build..."

# Instalar dependu00eancias na raiz
echo "Instalando dependu00eancias na raiz..."
npm install

# Instalar dependu00eancias do backend
echo "Instalando dependu00eancias do backend..."
cd backend
npm install

# Instalar dependu00eancias do websocket
echo "Instalando dependu00eancias do websocket..."
cd websocket
npm install
cd ../..

echo "Build concluu00eddo com sucesso!"