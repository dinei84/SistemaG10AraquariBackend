# Sistema G10 Araquari

Sistema de Gerenciamento Logu00edstico Araquari - Aplicau00e7u00e3o completa com backend, frontend e websocket para chat.

## Estrutura do Projeto

- `backend/`: API principal em Node.js/Express
- `backend/websocket/`: Servidor WebSocket para o chat
- `assets/`: Imagens e recursos estu00e1ticos
- `css/`: Estilos da aplicau00e7u00e3o
- `js/`: Scripts do frontend
- `pages/`: Pu00e1ginas adicionais da aplicau00e7u00e3o

## Requisitos

- Node.js 14 ou superior
- Conta no Firebase (para autenticau00e7u00e3o)

## Configurau00e7u00e3o

1. Clone o repositu00f3rio
2. Instale as dependu00eancias:
   ```
   npm run install:all
   ```
3. Configure as variu00e1veis de ambiente:
   - Copie o arquivo `.env.example` para `.env`
   - Preencha as variu00e1veis com seus valores

4. Configure o Firebase:
   - Crie um projeto no Firebase
   - Gere uma chave de serviu00e7o (arquivo JSON)
   - Renomeie para `firebase-service-account.json` e coloque na pasta `backend/`

## Execuu00e7u00e3o Local

```bash
# Iniciar o backend
npm run dev

# Iniciar o servidor WebSocket
npm run dev:websocket
```

## Deploy no Render

Esta aplicau00e7u00e3o estu00e1 configurada para deploy no Render usando o arquivo `render.yaml`.

### Serviu00e7os configurados:

1. **API Principal (sistemag10-api)**
   - Tipo: Web Service
   - Ambiente: Node.js

2. **Servidor WebSocket (sistemag10-websocket)**
   - Tipo: Web Service
   - Ambiente: Node.js

3. **Frontend (sistemag10-frontend)**
   - Tipo: Static Site

### Passos para o Deploy

1. Crie uma conta no [Render](https://render.com/)
2. Conecte seu repositu00f3rio Git
3. Use a opu00e7u00e3o "Blueprint" e selecione o arquivo `render.yaml`
4. Configure as variu00e1veis de ambiente secretas no dashboard do Render:
   - `FIREBASE_DATABASE_URL`
   - Adicione o conteu00fado do arquivo `firebase-service-account.json` como uma variu00e1vel de ambiente

## Licenu00e7a

ISC
