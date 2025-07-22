document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger');
    const sidebar = document.querySelector('.sidebar');
    
    if (hamburger && sidebar) {
        hamburger.addEventListener('click', function() {
            sidebar.classList.toggle('active');
            hamburger.classList.toggle('active');
        });
    }
    
    // Fechar menu ao clicar fora dele
    document.addEventListener('click', function(event) {
        if (sidebar && sidebar.classList.contains('active')) {
            if (!sidebar.contains(event.target) && !hamburger.contains(event.target)) {
                sidebar.classList.remove('active');
                hamburger.classList.remove('active');
            }
        }
    });
    
    // Fechar menu ao pressionar ESC
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && sidebar && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            hamburger.classList.remove('active');
        }
    });
}); 