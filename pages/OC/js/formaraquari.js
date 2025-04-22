function submitForm() {
    // Captura os dados do formulário
    const form = document.getElementById('orderForm');
    const formData = new FormData(form);

    // Converte os dados do formulário em um objeto
    const formObject = {};
    formData.forEach((value, key) => {
        formObject[key] = value;
    });

    // Armazena os dados no localStorage
    localStorage.setItem('formData', JSON.stringify(formObject));

    // Redireciona para a página de resultado
    window.location.href = 'ordemaraquari.html';
}

// document.getElementById('limpar'),addEventListener('click',()=>{
//     document.getElementById('cliente').value = ''
//     document.getElementById('coleta').value = ''
//     document.getElementById('armazem').value = ''
//     document.getElementById('coletaUF').value = ''
//     document.getElementById('entrega').value = ''
//     document.getElementById('entregaUF').value = ''
//     document.getElementById('veiculo-cavalo').value = ''
//     document.getElementById('veiculo-placa2').value = ''
//     document.getElementById('veiculo-dolly').value = ''
//     document.getElementById('veiculo-placa3').value = ''
//     document.getElementById('capacidade').value = ''
//     document.getElementById('motorista').value = ''
//     document.getElementById('CPFmotorista').value = ''
//     document.getElementById('previsaoCarregamento').value = ''
//     document.getElementById('pedido').value = ''
//     document.getElementById('observacoes').value = ''
// })

