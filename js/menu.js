document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger-menu');
    const sidebar = document.querySelector('.sidebar');
    
    hamburger.addEventListener('click', function() {
        sidebar.classList.toggle('active');
    });
}); 