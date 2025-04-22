# Backend com WebSocket Integrado

## Deploy no Render

Este backend foi configurado para funcionar no Render com WebSocket integrado.

### Configurações para o Render

1. **Root Directory**: `backend`
2. **Build Command**: `npm install`
3. **Start Command**: `npm start`
4. **Environment Variables**:
   - `PORT`: Deixe em branco (o Render fornecerá automaticamente)
   - `NODE_ENV`: `production`
   - `ENABLE_AUTH`: `false` (ou `true` se você tiver configurado o Firebase)
   - `FIREBASE_DATABASE_URL`: URL do seu banco de dados Firebase (se aplicável)

### Importante

- O servidor HTTP e WebSocket agora estão integrados e rodam na mesma porta
- O endpoint WebSocket estará disponível em `wss://sistemag10araquaribackend.onrender.com`
- O endpoint HTTP estará disponível em `https://sistemag10araquaribackend.onrender.com`

## Desenvolvimento Local

Para executar o servidor localmente:

```bash
npm install
npm start
```

Ou para desenvolvimento com reinicialização automática:

```bash
npm run dev
```