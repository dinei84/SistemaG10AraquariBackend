# Backend do Sistema G10 Araquari

Este é o backend do sistema, que fornece APIs e serviços para o frontend.

## Requisitos

- Node.js (versão 14 ou superior)
- npm (gerenciador de pacotes do Node.js)

## Configuração

1. Instale as dependências:
   ```
   npm install
   ```

2. Configure as credenciais do Firebase:
   - Renomeie o arquivo `firebase-service-account.example.json` para `firebase-service-account.json` e substitua com suas credenciais reais
   - Ou use o modo de desenvolvimento seguro que funciona sem credenciais reais

## Como iniciar o servidor

### Modo de produção
```
npm start
```

### Modo de desenvolvimento (requer credenciais configuradas)
```
npm run dev
```

### Modo de desenvolvimento seguro (funciona sem credenciais reais)
```
npm run dev:safe
```

## Servidor WebSocket (Chat)

O servidor WebSocket para o chat está localizado na pasta `websocket`. Para iniciá-lo:

1. Navegue até a pasta websocket:
   ```
   cd websocket
   ```

2. Instale as dependências (se ainda não tiver feito):
   ```
   npm install
   ```

3. Inicie o servidor WebSocket:
   ```
   npm start
   ```

   Ou em modo de desenvolvimento:
   ```
   npm run dev
   ```

   Ou a versão simplificada (sem autenticação):
   ```
   npm run simple
   ```

## Estrutura do projeto

- `server.js` - Ponto de entrada principal do servidor
- `routes/` - Definições de rotas da API
- `controllers/` - Lógica de negócios
- `middleware/` - Middlewares (autenticação, etc.)
- `config/` - Arquivos de configuração
- `websocket/` - Servidor WebSocket para o chat