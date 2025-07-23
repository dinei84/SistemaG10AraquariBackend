const loadingManager = {
    timeoutId: null,
    
    show() {
        clearTimeout(this.timeoutId); 
        document.getElementById('loadingOverlay').style.display = 'flex';
    },
    
    hide() {
        
        this.timeoutId = setTimeout(() => {
            const overlay = document.getElementById('loadingOverlay');
            if (overlay) {
                overlay.style.display = 'none';
            }
        }, 300);
    }
};

export default loadingManager;