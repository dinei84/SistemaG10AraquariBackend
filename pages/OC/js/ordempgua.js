// Verifica se está na página de resultado
if (window.location.pathname.endsWith('ordempgua.html')) {
    // Recupera os dados do localStorage
    const formData = JSON.parse(localStorage.getItem('formData'));

    // Preenche os elementos HTML com os dados do formulário
    document.getElementById('centroCustoSpan').textContent = formData.centroCusto;
    document.getElementById('clienteSpan').textContent = formData.cliente;
    document.getElementById('coletaSpan').textContent = formData.coleta;
    document.getElementById('armazemSpan').textContent = formData.armazem;
    document.getElementById('coletaUFSpan').textContent = formData.coletaUF;
    document.getElementById('entregaSpan').textContent = formData.entrega;
    document.getElementById('entregaUFSpan').textContent = formData.entregaUF;
    document.getElementById('produtoSpan').textContent = formData.produto;
    document.getElementById('veiculoCavaloSpan').textContent = formData['veiculo-cavalo'];
    document.getElementById('veiculoPlaca2Span').textContent = formData['veiculo-placa2'];
    document.getElementById('veiculo-dolly').textContent = formData['veiculo-dolly'];
    document.getElementById('veiculo-placa3').textContent = formData['veiculo-placa3'];
    document.getElementById('capacidadeSpan').textContent = formData.capacidade;
    document.getElementById('motoristaSpan').textContent = formData.motorista;
    document.getElementById('CPFmotoristaSpan').textContent = formData.CPFmotorista;
    document.getElementById('previsaoCarregamentoSpan').textContent = formData.previsaoCarregamento;
    document.getElementById('pedidoSpan').textContent = formData.pedido;
    document.getElementById('observacoesSpan').textContent = formData.observacoes;
}

document.getElementById('imprimir').addEventListener('click', function() {
    window.print();
});

