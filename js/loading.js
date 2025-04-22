const loadingManager = {
    timeoutId: null,
    
    show() {
        clearTimeout(this.timeoutId); // Limpa qualquer timeout pendente
        document.getElementById('loadingOverlay').style.display = 'flex';
    },
    
    hide() {
        // Usa um timeout mínimo de 300ms (você pode ajustar esse valor)
        this.timeoutId = setTimeout(() => {
            const overlay = document.getElementById('loadingOverlay');
            if (overlay) {
                overlay.style.display = 'none';
            }
        }, 300);
    }
};

export default loadingManager;