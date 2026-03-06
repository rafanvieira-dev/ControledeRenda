// Base de Dados
let bancoDeDados = JSON.parse(localStorage.getItem('financas_db')) || {
    renda: [],
    fixas: [],
    cartoes: [],
    emprestimos: []
};

function salvarDados() {
    localStorage.setItem('financas_db', JSON.stringify(bancoDeDados));
    carregarPaginaAtual();
}

function carregarPaginaAtual() {
    if (document.getElementById('resumo-saldo')) renderizarResumo();
    if (document.getElementById('lista-renda')) renderizarLista('renda', 'lista-renda');
    if (document.getElementById('lista-fixas')) renderizarLista('fixas', 'lista-fixas');
    if (document.getElementById('lista-cartoes')) renderizarCartoes();
    if (document.getElementById('lista-emprestimos')) renderizarEmprestimos();
}

// --- UTILITÁRIOS ---
function formatarData(dataString) {
    if(!dataString) return "N/A";
    let partes = dataString.split('-');
    if(partes.length !== 3) return dataString;
    return `${partes[2]}/${partes[1]}/${partes[0]}`; // Formata para DD/MM/AAAA
}

function calcularDataFim(dataInicio, qtdTotal) {
    if (!dataInicio) return "N/A";
    let data = new Date(dataInicio + "T00:00:00");
    data.setMonth(data.getMonth() + qtdTotal - 1);
    let mes = String(data.getMonth() + 1).padStart(2, '0');
    let ano = data.getFullYear();
    return `${mes}/${ano}`;
}

// --- FUNÇÕES DE RENDERIZAÇÃO ---

function renderizarResumo() {
    let totalRenda = bancoDeDados.renda.reduce((acc, item) => acc + item.valor, 0);
    let totalFixas = bancoDeDados.fixas.reduce((acc, item) => acc + item.valor, 0);
    
    // Soma apenas se a compra do cartão não estiver quitada
    let totalCartoes = bancoDeDados.cartoes.reduce((acc, item) => {
        return (item.parcelasPagas < item.qtdParcelas) ? acc + item.valorParcela : acc;
    }, 0);
    
    // Soma apenas se o empréstimo não estiver quitado
    let totalEmprestimos = bancoDeDados.emprestimos.reduce((acc, item) => {
        return (item.qtdPagas < item.qtdTotal) ? acc + item.valorParcela : acc;
    }, 0);
    
    let totalDespesas = totalFixas + totalCartoes + totalEmprestimos;

    document.getElementById('resumo-receitas').innerText = totalRenda.toFixed(2);
    document.getElementById('resumo-despesas').innerText = totalDespesas.toFixed(2);
    document.getElementById('resumo-saldo').innerText = (totalRenda - totalDespesas).toFixed(2);
}

function renderizarLista(categoria, idLista) {
    const lista = document.getElementById(idLista);
    lista.innerHTML = '';
    bancoDeDados[categoria].forEach((item, index) => {
        lista.innerHTML += `
            <li><span>${item.descricao}</span> <span>R$ ${item.valor.toFixed(2)}</span> 
            <button class="btn-del" onclick="deletar('${categoria}', ${index})">X</button></li>`;
    });
}

// NOVA LÓGICA DE CARTÕES (Agrupando por Fatura)
function renderizarCartoes() {
    const conteinerCartoes = document.getElementById('lista-cartoes');
    conteinerCartoes.innerHTML = '';

    let cartoesAgrupados = {};

    // Agrupa as compras pelo nome do cartão
    bancoDeDados.cartoes.forEach((compra, index) => {
        let nomeUpper = compra.cartao.toUpperCase(); // Padroniza o nome
        
        if(!cartoesAgrupados[nomeUpper]) {
            cartoesAgrupados[nomeUpper] = { totalFatura: 0, compras: [] };
        }
        
        // Se a compra ainda não foi quitada, soma na fatura do mês
        if (compra.parcelasPagas < compra.qtdParcelas) {
            cartoesAgrupados[nomeUpper].totalFatura += compra.valorParcela;
        }
        
        // Guarda a compra e o index original dela para podermos deletar/dar baixa
        cartoesAgrupados[nomeUpper].compras.push({...compra, indexOriginal: index});
    });

    // Desenha as faturas na tela
    for (let nomeCartao in cartoesAgrupados) {
        let dadosCartao = cartoesAgrupados[nomeCartao];

        let htmlFatura = `
            <div class="fatura-cartao">
                <div class="fatura-cabecalho">
                    <h3>💳 ${nomeCartao}</h3>
                    <div class="fatura-total">Fatura Atual: R$ ${dadosCartao.totalFatura.toFixed(2)}</div>
                </div>
                <ul>
        `;

        dadosCartao.compras.forEach(compra => {
            let finalizado = compra.parcelasPagas >= compra.qtdParcelas;
            htmlFatura += `
                <li style="${finalizado ? 'opacity: 0.5; border-left-color: #28a745;' : ''}">
                    <div>
                        <strong>${compra.descricao}</strong> <small style="color:#666;">(${formatarData(compra.dataCompra)})</small><br>
                        <small>Total: R$ ${compra.valorTotal.toFixed(2)} | Parcela: R$ ${compra.valorParcela.toFixed(2)}</small><br>
                        <small>Progresso: ${compra.parcelasPagas}/${compra.qtdParcelas} parcelas pagas</small>
                    </div>
                    <div class="botoes-acao">
                        ${!finalizado ? `<button class="btn-baixa" onclick="darBaixaCartao(${compra.indexOriginal})">Pagar 1x</button>` : `<span style="color:#28a745; font-weight:bold; margin-right: 10px;">Quitada!</span>`}
                        <button class="btn-del" onclick="deletar('cartoes', ${compra.indexOriginal})">X</button>
                    </div>
                </li>
            `;
        });

        htmlFatura += `</ul></div>`;
        conteinerCartoes.innerHTML += htmlFatura;
    }
}

function renderizarEmprestimos() {
    const lista = document.getElementById('lista-emprestimos');
    lista.innerHTML = '';
    bancoDeDados.emprestimos.forEach((item, index) => {
        let finalizado = item.qtdPagas >= item.qtdTotal;
        let dataFim = calcularDataFim(item.dataInicio, item.qtdTotal);
        
        lista.innerHTML += `
            <li style="${finalizado ? 'opacity: 0.6; border-left-color: #28a745;' : ''}">
                <div>
                    <strong>${item.descricao}</strong> (Total: R$ ${item.valorTotal.toFixed(2)})<br>
                    <small>Progresso: ${item.qtdPagas}/${item.qtdTotal} pagas | Parcela: R$ ${item.valorParcela.toFixed(2)}</small><br>
                    <small style="color: #666;">Termina em: <strong>${dataFim}</strong></small>
                </div>
                <div class="botoes-acao">
                    ${!finalizado ? `<button class="btn-baixa" onclick="darBaixaEmprestimo(${index})">Pagar 1x</button>` : `<span style="color:#28a745; font-weight:bold; margin-right: 10px;">Quitado!</span>`}
                    <button class="btn-del" onclick="deletar('emprestimos', ${index})">X</button>
                </div>
            </li>`;
    });
}

// --- AÇÕES ---
function darBaixaCartao(index) {
    let compra = bancoDeDados.cartoes[index];
    if (compra.parcelasPagas < compra.qtdParcelas - 1) {
        compra.parcelasPagas += 1;
    } else {
        compra.parcelasPagas += 1;
        alert('Você pagou a última parcela desta compra!');
    }
    salvarDados();
}

function darBaixaEmprestimo(index) {
    let emp = bancoDeDados.emprestimos[index];
    if (emp.qtdPagas < emp.qtdTotal - 1) {
        emp.qtdPagas += 1;
    } else {
        emp.qtdPagas += 1;
        alert('Parabéns! Você pagou a última parcela deste empréstimo!');
    }
    salvarDados();
}

function deletar(categoria, index) {
    if(confirm('Apagar este registro?')) {
        bancoDeDados[categoria].splice(index, 1);
        salvarDados();
    }
}

// --- EVENTOS DE FORMULÁRIO ---
const formRenda = document.getElementById('form-renda');
if(formRenda) formRenda.addEventListener('submit', (e) => {
    e.preventDefault();
    bancoDeDados.renda.push({ descricao: document.getElementById('desc').value, valor: parseFloat(document.getElementById('valor').value) });
    formRenda.reset(); salvarDados();
});

const formFixas = document.getElementById('form-fixas');
if(formFixas) formFixas.addEventListener('submit', (e) => {
    e.preventDefault();
    bancoDeDados.fixas.push({ descricao: document.getElementById('desc').value, valor: parseFloat(document.getElementById('valor').value) });
    formFixas.reset(); salvarDados();
});

// Formulário de Cartões
const formCartoes = document.getElementById('form-cartoes');
if(formCartoes) {
    const selectQtd = document.getElementById('qtd');
    for(let i = 1; i <= 48; i++) selectQtd.innerHTML += `<option value="${i}">${i}x</option>`;

    formCartoes.addEventListener('submit', (e) => {
        e.preventDefault();
        
        let valorTotal = parseFloat(document.getElementById('valor-total').value);
        let qtd = parseInt(document.getElementById('qtd').value);
        let valorParcela = valorTotal / qtd; // Calcula o valor da parcela automaticamente

        // Se for uma versão antiga dos dados, isso garante que não quebre
        bancoDeDados.cartoes.push({
            cartao: document.getElementById('cartao-nome').value.trim(),
            descricao: document.getElementById('desc').value,
            valorTotal: valorTotal,
            valorParcela: valorParcela,
            qtdParcelas: qtd,
            parcelasPagas: 0, // Começa com zero parcelas pagas
            dataCompra: document.getElementById('data-compra').value
        });
        formCartoes.reset(); salvarDados();
    });
}

// Formulário de Empréstimos
const formEmprestimos = document.getElementById('form-emprestimos');
if(formEmprestimos) {
    const selectTotal = document.getElementById('qtd-total');
    const selectPagas = document.getElementById('qtd-pagas');
    
    for(let i = 2; i <= 360; i++) selectTotal.innerHTML += `<option value="${i}">${i}x</option>`;
    for(let i = 0; i <= 360; i++) selectPagas.innerHTML += `<option value="${i}">${i}x</option>`;

    formEmprestimos.addEventListener('submit', (e) => {
        e.preventDefault();
        
        let total = parseInt(document.getElementById('qtd-total').value);
        let pagas = parseInt(document.getElementById('qtd-pagas').value);
        
        if (pagas > total) {
            alert("Erro: O número de parcelas pagas não pode ser maior que o total.");
            return;
        }

        bancoDeDados.emprestimos.push({
            descricao: document.getElementById('desc').value, 
            valorTotal: parseFloat(document.getElementById('valor-total').value),
            valorParcela: parseFloat(document.getElementById('valor-parcela').value), 
            qtdTotal: total,
            qtdPagas: pagas,
            dataInicio: document.getElementById('data-inicio').value
        });
        formEmprestimos.reset(); salvarDados();
    });
}

// Inicia
carregarPaginaAtual();
