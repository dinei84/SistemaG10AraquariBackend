# Funcionalidade de Controle de Emissores

## Descrição
Esta funcionalidade permite acompanhar e controlar a performance dos colaboradores (emissores) que estão criando ordens de carregamento no sistema.

## Como Funciona

### 1. Cadastro de Carregamentos
- No arquivo `adicionar_carregamento.html`, o campo "Emissor" permite selecionar quem está emitindo a ordem
- Os emissores disponíveis são: Dinei, Thiago, Geovane, Tom, João, Milene, João Vitor
- Cada carregamento é salvo na subcoleção `carregamentos` do frete correspondente

### 2. Dashboard de Controle
- No arquivo `dashboard.html`, há uma nova seção "Emissor do Mês"
- Permite selecionar um emissor específico para ver suas estatísticas
- Mostra: Ordens do Mês, Caminhões do Mês, Total Retirado (em toneladas)

### 3. Ranking de Emissores
- Nova seção "Ranking de Emissores do Mês" no dashboard
- Mostra todos os emissores ordenados por total de toneladas retiradas
- Inclui gráfico visual para comparação

## Estrutura de Dados

### Firestore
```
fretes/{freteId}/carregamentos/{carregamentoId}
├── emissor: string (nome do emissor)
├── dataoc: string (data da ordem de carregamento)
├── peso-carregado: number (peso em toneladas)
├── placa: string
├── motorista: string
└── ... outros campos
```

## Filtros Disponíveis
- **Período**: Mês Atual, Mês Anterior, Últimos 3 Meses, Últimos 6 Meses
- **Estado**: Todos os Estados, SC, PR, RS

## Funcionalidades Implementadas

### JavaScript (dashboard.js)
- `calcularEmissorStats()`: Calcula estatísticas de um emissor específico
- `calcularRankingEmissores()`: Gera ranking de todos os emissores
- `filtrarCarregamentosPorPeriodo()`: Filtra carregamentos por período
- Dados de exemplo para teste quando não há carregamentos reais

### CSS (dashboard.css)
- Estilos para tabelas de emissores
- Layout responsivo
- Hover effects nas tabelas

## Como Testar
1. Acesse o dashboard
2. Se não houver carregamentos reais, dados de exemplo serão criados automaticamente
3. Use o filtro "Emissor do Mês" para ver estatísticas individuais
4. Verifique o "Ranking de Emissores do Mês" para comparação geral

## Debug
- Console logs estão habilitados para acompanhar o carregamento de dados
- Verifique o console do navegador para informações de debug
- Dados de exemplo são criados automaticamente se não houver carregamentos reais

## Próximos Passos
- Adicionar filtros por cliente específico
- Implementar alertas para metas de performance
- Adicionar gráficos de tendência temporal
- Exportar relatórios em PDF/Excel