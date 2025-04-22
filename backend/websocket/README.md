# Servidor WebSocket para Chat

Este u00e9 um servidor WebSocket simples para o sistema de chat da aplicau00e7u00e3o. Ele permite a comunicau00e7u00e3o em tempo real entre os usuu00e1rios logados.

## Funcionalidades

- Comunicau00e7u00e3o em tempo real entre usuu00e1rios
- Lista de usuu00e1rios online
- Notificau00e7u00f5es de entrada e sau00edda de usuu00e1rios
- Integrau00e7u00e3o opcional com Firebase Authentication para verificau00e7u00e3o de tokens

## Configurau00e7u00e3o

1. Instale as dependu00eancias:
   ```
   npm install
   ```

2. Configure as variu00e1veis de ambiente:
   - Renomeie o arquivo `.env.example` para `.env`
   - Ajuste as variu00e1veis conforme necessu00e1rio

3. (Opcional) Configure o Firebase Admin SDK:
   - Copie o arquivo de credenciais do Firebase para `../firebase-service-account.json`
   - Isso permitiru00e1 a verificau00e7u00e3o de tokens de autenticau00e7u00e3o

## Executando o servidor

```
# Modo de desenvolvimento (com hot-reload)
npm run dev

# Modo de produu00e7u00e3o
npm start
```

## Protocolo de Comunicau00e7u00e3o

O servidor utiliza mensagens JSON para comunicau00e7u00e3o. Cada mensagem tem um campo `type` que define o tipo de mensagem.

### Tipos de mensagens enviadas pelo cliente:

- `user_info`: Informau00e7u00f5es do usuu00e1rio que acabou de se conectar
- `chat_message`: Mensagem de chat enviada pelo usuu00e1rio
- `user_logout`: Notificau00e7u00e3o de que o usuu00e1rio estu00e1 saindo

### Tipos de mensagens enviadas pelo servidor:

- `user_list`: Lista de usuu00e1rios online
- `user_joined`: Notificau00e7u00e3o de que um usuu00e1rio entrou
- `user_left`: Notificau00e7u00e3o de que um usuu00e1rio saiu
- `chat_message`: Mensagem de chat (repassada para todos os clientes)
- `error`: Mensagem de erro