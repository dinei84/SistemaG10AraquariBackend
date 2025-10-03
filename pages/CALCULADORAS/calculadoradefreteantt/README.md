# Calculadora Frete ANTT - Sistema G10

## 📋 Descrição
Calculadora de frete ANTT totalmente integrada ao sistema G10, seguindo as fórmulas oficiais da Portaria SUROC Nº 12/2024.

## 🎯 Funcionalidades

### ✅ Cálculos ANTT Corretos
- **Fórmulas oficiais** conforme regulamentação ANTT
- **Valor Ida**: (Distância × CCD) + CC
- **Valor Retorno**: 92% do valor ida
- **Aplicação correta de ICMS e margem** usando gross-up
- **Cálculo por tonelada** para empresa e motorista

### 🔧 Modos de Entrada
1. **Manual**: Inserção direta de distância e pedágios
2. **Google Maps**: Cálculo automático via API

### 📊 Tabelas ANTT Suportadas
- **6 Eixos**: CCD 6,7301 | CC R$ 660,12 | Peso máx: 32t
- **7 Eixos**: CCD 7,3085 | CC R$ 752,64 | Peso máx: 37t  
- **9 Eixos**: CCD 8,2680 | CC R$ 815,30 | Peso máx: 49t

## 🚀 Como Usar

### 1. Acesso
- Menu principal → "Calculadora Frete ANTT"
- Ou através da página de calculadoras

### 2. Preenchimento
1. **Selecione o tipo de carga**
2. **Escolha o número de eixos**
3. **Defina a distância** (manual ou Google Maps)
4. **Configure pedágios** para cada tipo de veículo
5. **Ajuste ICMS e margem de lucro**

### 3. Cálculo
- Clique em **"Calcular Cotação"**
- Visualize os resultados em cards organizados
- Cada cálculo gera novos cards (histórico)

## 🧮 Lógica de Cálculo

### Fórmulas Aplicadas
```
Valor Ida = (Distância × CCD) + CC
Valor Retorno = 0,92 × Distância × CCD
Total ANTT = Valor Ida + Valor Retorno

// Aplicação de impostos e margem (gross-up)
Subtotal = Total ANTT ÷ (1 - (ICMS% + Margem%) ÷ 100)
ICMS = Subtotal - Total ANTT × (ICMS% ÷ (ICMS% + Margem%))
Margem = Subtotal - Total ANTT × (Margem% ÷ (ICMS% + Margem%))

Valor Final = Subtotal + Pedágio
```

### Cálculo por Tonelada
- **Empresa**: Valor Final ÷ Peso Máximo
- **Motorista**: (Total ANTT + Pedágio) ÷ Peso Máximo

## 🎨 Interface

### Layout Responsivo
- **Desktop**: Formulário à esquerda, cards à direita
- **Mobile**: Formulário empilhado, cards em coluna

### Cards de Resultado
Cada card exibe:
- Tipo de operação e eixos
- Distância e coeficientes utilizados
- Valores de ida e retorno
- Aplicação de ICMS e margem
- Valor final total
- Frete por tonelada (empresa e motorista)

## 🔧 Configuração

### Google Maps API
```javascript
// Arquivo: config.js
GOOGLE_MAPS_API_KEY: 'AIzaSyA1eBHc0R3LEhm64qv9skwmYBMKXbi_Puw'
```

### Tabelas ANTT
```javascript
ANTT_TABLES: {
    '6': { ccd: 6.7301, cc: 660.12, maxWeight: 32 },
    '7': { ccd: 7.3085, cc: 752.64, maxWeight: 37 },
    '9': { ccd: 8.2680, cc: 815.30, maxWeight: 49 }
}
```

## 📱 Responsividade

### Breakpoints
- **Desktop**: ≥1200px (layout 2 colunas)
- **Tablet**: 768px-1199px (layout adaptativo)
- **Mobile**: ≤767px (layout empilhado)

### Otimizações Mobile
- Botões touch-friendly
- Formulário otimizado
- Cards em coluna única
- Menu lateral colapsável

## 🔐 Autenticação

### Integração Firebase
- Verificação automática de usuário logado
- Redirecionamento para login se necessário
- Logout funcional

### Controle de Acesso
- Acesso restrito a usuários autenticados
- Sessão mantida entre navegações

## 🎯 Recursos Avançados

### Validação em Tempo Real
- Campos obrigatórios
- Valores mínimos/máximos
- Formatação automática
- Mensagens de erro contextuais

### Notificações
- Sucesso/erro com animações
- Auto-dismiss após 5 segundos
- Posicionamento fixo

### Histórico de Cálculos
- Múltiplos cards por sessão
- Botão para limpar resultados
- Persistência durante navegação

## 🛠️ Manutenção

### Estrutura de Arquivos
```
calculadoradefreteantt/
├── index.html          # Página principal
├── style.css           # Estilos responsivos
├── script.js           # Lógica da calculadora
├── config.js           # Configurações e utilitários
└── README.md           # Esta documentação
```

### Personalização
- Cores e estilos em `style.css`
- Configurações em `config.js`
- Lógica de cálculo em `script.js`

## 🐛 Solução de Problemas

### Cálculos Incorretos
1. Verifique se os valores ANTT estão atualizados
2. Confirme a aplicação do gross-up
3. Valide os coeficientes CCD e CC

### Google Maps Não Funciona
1. Verifique a chave da API
2. Confirme as permissões da API
3. Teste a conectividade

### Interface Quebrada
1. Verifique o CSS responsivo
2. Confirme os breakpoints
3. Teste em diferentes dispositivos

## 📈 Próximas Melhorias

### Funcionalidades Planejadas
- [ ] Exportação para PDF/CSV
- [ ] Histórico persistente
- [ ] Múltiplos tipos de carga
- [ ] Comparação de cenários
- [ ] Relatórios detalhados

### Otimizações
- [ ] Cache de resultados
- [ ] Compressão de assets
- [ ] PWA (Progressive Web App)
- [ ] Offline support

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique esta documentação
2. Consulte o código fonte
3. Entre em contato com a equipe de desenvolvimento

---

**Versão**: 1.0.0  
**Última atualização**: Dezembro 2024  
**Compatibilidade**: Navegadores modernos (Chrome, Firefox, Safari, Edge)