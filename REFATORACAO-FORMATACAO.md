# Refatoração do Sistema de Formatação de Números

## Resumo das Mudanças

Este documento descreve a refatoração realizada para padronizar a formatação de números em todo o sistema G10 Araquari.

## Problema Identificado

O sistema apresentava inconsistências na formatação de números:
- Diferentes arquivos usavam diferentes configurações para `minimumFractionDigits` e `maximumFractionDigits`
- Mistura de tipos de dados (valores monetários vs. unidades de medida)
- Formatação inconsistente entre `.toFixed(2)` e `.toFixed(3)`
- Parsing inconsistente de strings formatadas

## Solução Implementada

### 1. Arquivo Utilitário Centralizado
Criado `js/number-formatter.js` com funções padronizadas:

#### Funções de Formatação:
- `formatCurrency(number)` - Para valores monetários (2 casas decimais)
- `formatWeight(number)` - Para unidades de medida como peso (3 casas decimais)
- `formatWeightConditional(number)` - Para peso com decimais condicionais
- `parseFormattedNumber(str)` - Converte string formatada para número
- `roundUp(value)` - Arredondamento para cálculos de ICMS
- `formatDate(date)` - Formatação de datas no padrão brasileiro

#### Funções de Configuração de Input:
- `setupCurrencyInput(inputId)` - Configura input para valores monetários
- `setupWeightInput(inputId)` - Configura input para unidades de medida

### 2. Arquivos Refatorados

#### Calculadoras:
- `pages/CALCULADORAS/CALC FRETE MOT/calculador.js`
  - Substituída função `formatNumber` local por `formatCurrency`
  - Implementada configuração automática de inputs
  - Padronizada formatação de resultados

- `pages/CALCULADORAS/CALC ICMS/calculo.js`
  - Substituída função `formatNumber` local por `formatCurrency`
  - Substituída função `arredondar` local por `roundUp`
  - Padronizada formatação de todos os campos monetários

#### Planilha:
- `pages/PLANILHA/js/lista_fretes.js`
  - Substituídas funções locais pelas funções centralizadas
  - Padronizada formatação de pesos (3 casas decimais)
  - Substituída função `formatarData` por `formatDate`

#### Mostrador:
- `pages/MOSTRADOR/index1.html`
  - Convertido para usar módulos ES6
  - Implementada formatação consistente de valores

- `pages/MOSTRADOR/lista_fretes.html`
  - Convertido para usar módulos ES6
  - Padronizada formatação de valores na tabela

### 3. Arquivo de Teste
Criado `test-formatter.html` para validar todas as funções de formatação.

## Padrões Estabelecidos

### Valores Monetários:
- **Formato**: `1.234,56` (ponto para milhares, vírgula para decimais)
- **Casas decimais**: Sempre 2
- **Função**: `formatCurrency()`

### Unidades de Medida (Peso):
- **Formato**: `1.234,567` (ponto para milhares, vírgula para decimais)
- **Casas decimais**: Sempre 3
- **Função**: `formatWeight()`

### Peso Condicional:
- **Formato**: `1.234` (sem decimais se for número inteiro) ou `1.234,567` (com decimais se necessário)
- **Função**: `formatWeightConditional()`

### Datas:
- **Formato**: `dd/mm/aaaa`
- **Função**: `formatDate()`

## Benefícios da Refatoração

1. **Consistência**: Todos os números são formatados da mesma forma em todo o sistema
2. **Manutenibilidade**: Mudanças na formatação precisam ser feitas apenas em um lugar
3. **Reutilização**: Funções podem ser facilmente importadas em novos arquivos
4. **Padronização**: Estabelece padrões claros para diferentes tipos de dados
5. **Facilidade de Teste**: Arquivo de teste dedicado para validar formatações

## Como Usar em Novos Arquivos

```javascript
// Importar as funções necessárias
import { 
  formatCurrency, 
  formatWeight, 
  parseFormattedNumber 
} from './js/number-formatter.js';

// Usar as funções
const valorFormatado = formatCurrency(1234.56); // "1.234,56"
const pesoFormatado = formatWeight(25.750); // "25,750"
const numeroConvertido = parseFormattedNumber("1.234,56"); // 1234.56
```

## Configuração de Inputs Automática

```javascript
import { setupCurrencyInput, setupWeightInput } from './js/number-formatter.js';

// Configurar inputs para formatação automática
setupCurrencyInput('valorInput');
setupWeightInput('pesoInput');
```

## Arquivos Modificados

- ✅ `js/number-formatter.js` (novo)
- ✅ `pages/CALCULADORAS/CALC FRETE MOT/calculador.js`
- ✅ `pages/CALCULADORAS/CALC ICMS/calculo.js`
- ✅ `pages/PLANILHA/js/lista_fretes.js`
- ✅ `pages/MOSTRADOR/index1.html`
- ✅ `pages/MOSTRADOR/lista_fretes.html`
- ✅ `test-formatter.html` (novo)

## Próximos Passos

1. Testar todas as funcionalidades em ambiente de desenvolvimento
2. Verificar se todos os cálculos continuam corretos
3. Aplicar as mesmas padronizações em outros arquivos do sistema conforme necessário
4. Considerar implementar validação de entrada mais robusta nos inputs