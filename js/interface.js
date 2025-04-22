document.addEventListener('DOMContentLoaded', function() {
    const links = document.querySelectorAll('a.spreadsheet, a.freight_query, a.contacts , a.chat, a.chargerorder, a.calculators');

    links.forEach(link => {
        const frontSide = document.createElement('div');
        frontSide.className = 'front';
        frontSide.innerHTML = link.innerHTML; // Mantém o texto original dentro do front
        link.innerHTML = ''; // Limpa o conteúdo original
        link.appendChild(frontSide);

        const backSide = document.createElement('div');
        backSide.className = 'back';
        backSide.style.backgroundImage = `url(${getImageSource(link.classList[0])})`;
        link.appendChild(backSide);

        // Controla a rotação no hover
        link.addEventListener('mouseenter', () => {
            link.style.transform = 'rotateY(180deg)';
        });

        link.addEventListener('mouseleave', () => {
            link.style.transform = 'rotateY(0deg)';
        });
    });
});

function getImageSource(className) {
    const imageSources = {
        'spreadsheet': '../assets/planilha.png',
        'freight_query': '../assets/lupa.png',
        'chat': '../assets/social_10661781.png',
        'contacts' : '../assets/contatos.png',
        'chargerorder' : '../assets/registro-online.png',
        'calculators': '../assets/calculadora.png'
    };

    return imageSources[className] || '';
}
