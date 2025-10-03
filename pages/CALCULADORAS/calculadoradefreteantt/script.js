// Importações necessárias
import { auth } from "../../../js/firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-auth.js";
import { CONFIG, UTILS, ERROR_MESSAGES, SUCCESS_MESSAGES } from './config.js';

// Classe principal da calculadora
class FreightCalculator {
    constructor() {
        this.results = [];
        this.initializeElements();
        this.bindEvents();
        this.setupAuth();
        this.updateValidityDate();
    }

    initializeElements() {
        // Elementos do formulário
        this.manualForm = document.getElementById('manualForm');
        this.googleForm = document.getElementById('googleForm');
        this.cargoType = document.getElementById('cargoType');
        this.axles = document.getElementById('axles');
        this.distance = document.getElementById('distance');
        this.toll6Axles = document.getElementById('toll6Axles');
        this.toll7Axles = document.getElementById('toll7Axles');
        this.toll9Axles = document.getElementById('toll9Axles');
        this.icms = document.getElementById('icms');
        this.profitMargin = document.getElementById('profitMargin');
        this.origin = document.getElementById('origin');
        this.destination = document.getElementById('destination');
        
        // Botões
        this.calculateQuote = document.getElementById('calculateQuote');
        this.calculateRoute = document.getElementById('calculateRoute');
        this.clearResults = document.getElementById('clearResults');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.logoutBtnHeader = document.querySelector('.logout-btn-header');
        
        // Containers
        this.resultsContainer = document.getElementById('resultsContainer');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.userEmail = document.getElementById('userEmail');
    }

    bindEvents() {
        // Seletor de modo
        document.querySelectorAll('input[name="inputMode"]').forEach(radio => {
            radio.addEventListener('change', this.handleModeChange.bind(this));
        });

        // Cálculo de cotação
        this.calculateQuote.addEventListener('click', this.calculateFreight.bind(this));
        
        // Cálculo de rota
        this.calculateRoute.addEventListener('click', this.calculateRouteData.bind(this));
        
        // Geolocalização
        this.setupGeolocation();
        
        // Limpar resultados
        this.clearResults.addEventListener('click', this.clearAllResults.bind(this));
        
        // Logout
        this.logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        this.logoutBtnHeader.addEventListener('click', this.handleLogout.bind(this));
        
        // Validação em tempo real
        this.distance.addEventListener('input', this.validateInput.bind(this));
        this.icms.addEventListener('input', this.validateInput.bind(this));
        this.profitMargin.addEventListener('input', this.validateInput.bind(this));
    }

    setupAuth() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.userEmail.textContent = user.email;
            } else {
                try {
                    window.location.href = '/login.html';
                } catch (_) {}
            }
        });
    }

    updateValidityDate() {
        const now = new Date();
        const validityDate = now.toLocaleString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        document.getElementById('validityDate').textContent = validityDate;
    }

    handleModeChange(event) {
        const mode = event.target.value;
        
        if (mode === 'manual') {
            this.manualForm.style.display = 'block';
            this.googleForm.style.display = 'none';
        } else {
            this.manualForm.style.display = 'none';
            this.googleForm.style.display = 'block';
        }
    }

    async calculateRouteData() {
        if (!this.origin.value.trim() || !this.destination.value.trim()) {
            this.showError(ERROR_MESSAGES.REQUIRED_FIELD);
            return;
        }

        this.showLoading('Calculando rota...');

        try {
            // Usar Directions API para obter informações mais detalhadas
            const directionsResponse = await this.getDirectionsData();
            
            if (directionsResponse) {
                this.distance.value = directionsResponse.distance.toFixed(1);
                this.showSuccess(`Rota calculada: ${directionsResponse.distance.toFixed(1)} km`);
                
                // Opcional: mostrar informações adicionais
                this.showRouteDetails(directionsResponse);
            } else {
                throw new Error(ERROR_MESSAGES.INVALID_ROUTE);
            }
        } catch (error) {
            console.error('Erro ao calcular rota:', error);
            this.showError(ERROR_MESSAGES.NETWORK_ERROR);
        } finally {
            this.hideLoading();
        }
    }

    async getDirectionsData() {
        const origin = this.origin.value.trim();
        const destination = this.destination.value.trim();
        
        const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${CONFIG.GOOGLE_MAPS_API_KEY}&language=pt-BR&units=metric&avoid=tolls=false`;
        
        try {
            const response = await fetch(directionsUrl);
            const data = await response.json();

            if (data.status === 'OK' && data.routes.length > 0) {
                const route = data.routes[0];
                const leg = route.legs[0];
                
                return {
                    distance: leg.distance.value / 1000, // Converter para km
                    duration: leg.duration.text,
                    startAddress: leg.start_address,
                    endAddress: leg.end_address,
                    steps: route.legs[0].steps,
                    tolls: this.extractTollInfo(route.legs[0].steps)
                };
            } else {
                throw new Error(data.error_message || ERROR_MESSAGES.INVALID_ROUTE);
            }
        } catch (error) {
            console.error('Erro na Directions API:', error);
            throw error;
        }
    }

    extractTollInfo(steps) {
        // Tentar identificar pedágios baseado nas instruções
        const tollKeywords = ['pedágio', 'toll', 'praça de pedágio', 'cobrança'];
        let tollCount = 0;
        
        steps.forEach(step => {
            const instruction = step.html_instructions.toLowerCase();
            if (tollKeywords.some(keyword => instruction.includes(keyword))) {
                tollCount++;
            }
        });
        
        return {
            count: tollCount,
            estimated: tollCount > 0 ? this.estimateTollCosts(tollCount) : null
        };
    }

    estimateTollCosts(tollCount) {
        // Estimativa baseada em pedágios típicos no Brasil
        return {
            '6': tollCount * 15, // R$ 15 por pedágio para 6 eixos
            '7': tollCount * 18, // R$ 18 por pedágio para 7 eixos  
            '9': tollCount * 22  // R$ 22 por pedágio para 9 eixos
        };
    }

    showRouteDetails(routeData) {
        // Criar modal ou seção para mostrar detalhes da rota
        const detailsHtml = `
            <div class="route-details">
                <h4>Detalhes da Rota</h4>
                <p><strong>Distância:</strong> ${routeData.distance.toFixed(1)} km</p>
                <p><strong>Duração:</strong> ${routeData.duration}</p>
                <p><strong>Origem:</strong> ${routeData.startAddress}</p>
                <p><strong>Destino:</strong> ${routeData.endAddress}</p>
                ${routeData.tolls.count > 0 ? `
                    <p><strong>Pedágios identificados:</strong> ${routeData.tolls.count}</p>
                    <div class="toll-estimates">
                        <small>Estimativas de pedágio:</small>
                        <ul>
                            <li>6 eixos: ${this.formatCurrency(routeData.tolls.estimated['6'])}</li>
                            <li>7 eixos: ${this.formatCurrency(routeData.tolls.estimated['7'])}</li>
                            <li>9 eixos: ${this.formatCurrency(routeData.tolls.estimated['9'])}</li>
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
        
        // Inserir detalhes na interface (opcional)
        const detailsContainer = document.getElementById('routeDetails');
        if (detailsContainer) {
            detailsContainer.innerHTML = detailsHtml;
        }
    }

    setupGeolocation() {
        // Adicionar botão de geolocalização se não existir
        if (!document.getElementById('getCurrentLocation')) {
            const geoButton = document.createElement('button');
            geoButton.id = 'getCurrentLocation';
            geoButton.type = 'button';
            geoButton.className = 'btn btn-secondary';
            geoButton.innerHTML = '<i class="fas fa-map-marker-alt"></i> Minha Localização';
            geoButton.addEventListener('click', this.getCurrentLocation.bind(this));
            
            // Inserir botão próximo ao campo de origem
            const originField = this.origin.closest('.form-group');
            if (originField) {
                originField.appendChild(geoButton);
            }
        }
    }

    async getCurrentLocation() {
        if (!navigator.geolocation) {
            this.showError('Geolocalização não é suportada neste navegador.');
            return;
        }

        this.showLoading('Obtendo sua localização...');

        try {
            const position = await this.getCurrentPosition();
            const { latitude, longitude } = position.coords;
            
            // Obter endereço usando Geocoding API
            const address = await this.reverseGeocode(latitude, longitude);
            
            if (address) {
                this.origin.value = address;
                this.showSuccess('Localização obtida com sucesso!');
            } else {
                this.origin.value = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                this.showSuccess('Coordenadas obtidas com sucesso!');
            }
        } catch (error) {
            console.error('Erro na geolocalização:', error);
            this.showError('Não foi possível obter sua localização. Verifique as permissões.');
        } finally {
            this.hideLoading();
        }
    }

    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            const options = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000 // 5 minutos
            };

            navigator.geolocation.getCurrentPosition(
                (position) => resolve(position),
                (error) => {
                    let message = 'Erro na geolocalização: ';
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            message += 'Permissão negada pelo usuário.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            message += 'Localização indisponível.';
                            break;
                        case error.TIMEOUT:
                            message += 'Tempo limite excedido.';
                            break;
                        default:
                            message += 'Erro desconhecido.';
                            break;
                    }
                    reject(new Error(message));
                },
                options
            );
        });
    }

    async reverseGeocode(latitude, longitude) {
        try {
            const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${CONFIG.GOOGLE_MAPS_API_KEY}&language=pt-BR`;
            
            const response = await fetch(geocodingUrl);
            const data = await response.json();

            if (data.status === 'OK' && data.results.length > 0) {
                return data.results[0].formatted_address;
            }
            return null;
        } catch (error) {
            console.error('Erro no reverse geocoding:', error);
            return null;
        }
    }

    calculateFreight() {
        if (!this.validateForm()) {
            return;
        }

        const formData = this.getFormData();
        const results = this.performCalculations(formData);
        
        this.addResultCard(results);
        this.showSuccess('Cálculo realizado com sucesso!');
    }

    validateForm() {
        let isValid = true;
        
        // Validar campos obrigatórios
        if (!this.cargoType.value) {
            this.showFieldError(this.cargoType, 'Selecione o tipo de carga');
            isValid = false;
        }
        
        if (!this.axles.value) {
            this.showFieldError(this.axles, 'Selecione o número de eixos');
            isValid = false;
        }
        
        if (!this.distance.value || this.distance.value <= 0) {
            this.showFieldError(this.distance, 'Digite uma distância válida');
            isValid = false;
        }
        
        if (!this.icms.value || this.icms.value < 0 || this.icms.value > 100) {
            this.showFieldError(this.icms, 'ICMS deve estar entre 0 e 100%');
            isValid = false;
        }
        
        if (!this.profitMargin.value || this.profitMargin.value < 0 || this.profitMargin.value > 100) {
            this.showFieldError(this.profitMargin, 'Margem deve estar entre 0 e 100%');
            isValid = false;
        }
        
        return isValid;
    }

    getFormData() {
        return {
            cargoType: this.cargoType.value,
            axles: this.axles.value,
            distance: parseFloat(this.distance.value),
            toll6Axles: parseFloat(this.toll6Axles.value) || 0,
            toll7Axles: parseFloat(this.toll7Axles.value) || 0,
            toll9Axles: parseFloat(this.toll9Axles.value) || 0,
            icms: parseFloat(this.icms.value),
            profitMargin: parseFloat(this.profitMargin.value)
        };
    }

    performCalculations(data) {
        const results = [];
        const axlesOptions = ['6', '7', '9'];
        
        axlesOptions.forEach(axles => {
            const table = CONFIG.ANTT_TABLES[axles];
            const tollValue = data[`toll${axles}Axles`];
            
            // Cálculo do valor ida
            const valueIda = (data.distance * table.ccd) + table.cc;
            
            // Cálculo do valor retorno (92% apenas do deslocamento, não do CC)
            const valueRetorno = 0.92 * (data.distance * table.ccd);
            
            // Piso mínimo ANTT considera apenas a IDA (sem retorno)
            const totalANTT = valueIda;
            
            // LÓGICA CORRETA: Aplicar gross-up de impostos e margem sobre o valor ANTT
            const totalPercent = data.icms + data.profitMargin;
            const subtotal = totalPercent > 0 ? totalANTT / (1 - (totalPercent / 100)) : totalANTT;
            
            // Calcular valores individuais de ICMS e margem
            const markupTotal = subtotal - totalANTT;
            const icmsValue = totalPercent > 0 ? markupTotal * (data.icms / totalPercent) : 0;
            const marginValue = totalPercent > 0 ? markupTotal * (data.profitMargin / totalPercent) : 0;
            
            // Valor final = subtotal + pedágio
            const finalTotal = subtotal + tollValue;
            
            // Cálculo por tonelada
            const freightCompany = finalTotal / table.maxWeight;
            const freightDriver = (totalANTT + tollValue) / table.maxWeight; // Base motorista = ANTT + pedágio
            
            results.push({
                axles: axles,
                operation: table.operation,
                distance: data.distance,
                ccd: table.ccd,
                cc: table.cc,
                valueIda: valueIda,
                valueRetorno: valueRetorno,
                totalANTT: totalANTT,
                icmsValue: icmsValue,
                marginValue: marginValue,
                tollValue: tollValue,
                subtotal: subtotal,
                finalTotal: finalTotal,
                maxWeight: table.maxWeight,
                freightCompany: freightCompany,
                freightDriver: freightDriver
            });
        });
        
        return results;
    }

    addResultCard(results) {
        // Remover mensagem de "nenhum resultado"
        const noResults = this.resultsContainer.querySelector('.no-results');
        if (noResults) {
            noResults.remove();
        }
        
        // Criar card para cada resultado
        results.forEach(result => {
            const card = this.createResultCard(result);
            this.resultsContainer.appendChild(card);
        });
        
        // Adicionar aos resultados
        this.results.push(...results);
    }

    createResultCard(result) {
        const card = document.createElement('div');
        card.className = 'result-card result-card-compact';
        
        card.innerHTML = `
            <div class="result-header">
                <div class="result-title">${result.axles} Eixos</div>
                <div class="result-axles">${result.operation}</div>
            </div>
            
            <div class="result-content">
                <div class="result-item">
                    <span class="result-label">Piso Mínimo ANTT:</span>
                    <span class="result-value">${this.formatCurrency(result.totalANTT)}</span>
                </div>
                
                <div class="result-item">
                    <span class="result-label">+ ICMS (${this.icms.value}%):</span>
                    <span class="result-value">${this.formatCurrency(result.icmsValue)}</span>
                </div>
                
                <div class="result-item">
                    <span class="result-label">+ Margem (${this.profitMargin.value}%):</span>
                    <span class="result-value">${this.formatCurrency(result.marginValue)}</span>
                </div>
                
                <div class="result-item">
                    <span class="result-label">Subtotal:</span>
                    <span class="result-value">${this.formatCurrency(result.subtotal)}</span>
                </div>
                
                <div class="result-item">
                    <span class="result-label">+ Pedágio:</span>
                    <span class="result-value">${this.formatCurrency(result.tollValue)}</span>
                </div>
            </div>
            
            <div class="result-total">
                <div class="label">VALOR FINAL TOTAL:</div>
                <div class="value">${this.formatCurrency(result.finalTotal)}</div>
            </div>
            
            <div class="result-freight">
                <div class="freight-item freight-company">
                    <div class="freight-label">FRETE EMPRESA/TON (${result.maxWeight}t):</div>
                    <div class="freight-value">${this.formatCurrency(result.freightCompany)}</div>
                </div>
                
                <div class="freight-item freight-driver">
                    <div class="freight-label">FRETE MOTORISTA/TON:</div>
                    <div class="freight-value">${this.formatCurrency(result.freightDriver)}</div>
                </div>
            </div>
        `;
        
        return card;
    }

    clearAllResults() {
        this.results = [];
        this.resultsContainer.innerHTML = `
            <div class="no-results">
                <i class="fas fa-calculator"></i>
                <p>Nenhum cálculo realizado ainda</p>
                <span>Preencha o formulário e clique em "Calcular Cotação"</span>
            </div>
        `;
    }

    // Utilitários
    formatCurrency(value) {
        return UTILS.formatCurrency(value);
    }

    validateInput(event) {
        const input = event.target;
        const value = parseFloat(input.value);
        
        if (input.type === 'number') {
            if (value < 0) {
                input.value = 0;
            }
            if (input.id === 'icms' || input.id === 'profitMargin') {
                if (value > 100) {
                    input.value = 100;
                }
            }
        }
        
        this.clearFieldError(input);
    }

    showFieldError(field, message) {
        const formGroup = field.closest('.form-group');
        formGroup.classList.add('error');
        
        let errorElement = formGroup.querySelector('.error-message');
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'error-message';
            formGroup.appendChild(errorElement);
        }
        errorElement.textContent = message;
    }

    clearFieldError(field) {
        const formGroup = field.closest('.form-group');
        formGroup.classList.remove('error');
        const errorElement = formGroup.querySelector('.error-message');
        if (errorElement) {
            errorElement.remove();
        }
    }

    showLoading(message = 'Carregando...') {
        this.loadingOverlay.querySelector('p').textContent = message;
        this.loadingOverlay.style.display = 'flex';
    }

    hideLoading() {
        this.loadingOverlay.style.display = 'none';
    }

    showSuccess(message) {
        // Implementar notificação de sucesso
        console.log('Sucesso:', message);
        this.showNotification(message, 'success');
    }

    showError(message) {
        // Implementar notificação de erro
        console.error('Erro:', message);
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // Criar elemento de notificação
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Adicionar estilos
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            z-index: 1001;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Remover após 5 segundos
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }

    async handleLogout() {
        try {
            await signOut(auth);
            window.location.href = '/index.html';
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    }
}

// Inicializar a calculadora quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    new FreightCalculator();
});
