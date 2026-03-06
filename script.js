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

// --- FUNÇÕES DE RENDERIZAÇÃO ---

function renderizarResumo() {
    let totalRenda = bancoDeDados.renda.reduce((acc, item) => acc + item.valor, 0);
    let totalFixas = bancoDeDados.fixas.reduce((acc, item) => acc + item.valor, 0);
    let totalCartoes = bancoDeDados.cartoes.reduce((acc, item) => acc + item.valorParcela, 0);
    
    // Soma a parcela do empréstimo APENAS se ele ainda não estiver quitado
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

function renderizarCartoes() {
    const lista = document.getElementById('lista-cartoes');
    lista.innerHTML = '';
    bancoDeDados.cartoes.forEach((item, index) => {
        lista.innerHTML += `
            <li>
                <div><strong>[${item.cartao}] ${item.descricao}</strong><br><small>Restam: ${item.qtdParcelas}x de R$ ${item.valorParcela.toFixed(2)}</small></div>
                <div class="botoes-acao">
                    <button class="btn-baixa" onclick="darBaixaCartao(${index})">Pagar 1x</button>
                    <button class="btn-del" onclick="deletar('cartoes', ${index})">X</button>
                </div>
            </li>`;
    });
}

// --- NOVA LÓGICA DE EMPRÉSTIMOS ---

// Calcula quando o empréstimo vai acabar
function calcularDataFim(dataInicio, qtdTotal) {
    if (!dataInicio) return "N/A";
    let data = new Date(dataInicio + "T00:00:00"); // Resolve problema de fuso horário
    data.setMonth(data.getMonth() + qtdTotal - 1);
    let mes = String(data.getMonth() + 1).padStart(2, '0');
    let ano = data.getFullYear();
    return `${mes}/${ano}`;
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
    if (bancoDeDados.cartoes[index].qtdParcelas > 1) {
        bancoDeDados.cartoes[index].qtdParcelas -= 1;
    } else {
        alert('Última parcela do cartão paga! Removido.');
        bancoDeDados.cartoes.splice(index, 1);
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

const formCartoes = document.getElementById('form-cartoes');
if(formCartoes) formCartoes.addEventListener('submit', (e) => {
    e.preventDefault();
    bancoDeDados.cartoes.push({
        cartao: document.getElementById('cartao-nome').value, descricao: document.getElementById('desc').value,
        valorParcela: parseFloat(document.getElementById('valor').value), qtdParcelas: parseInt(document.getElementById('qtd').value)
    });
    formCartoes.reset(); salvarDados();
});

const formEmprestimos = document.getElementById('form-emprestimos');
if(formEmprestimos) {
    // Cria as opções de 2 a 24 e 0 a 24 automaticamente
    const selectTotal = document.getElementById('qtd-total');
    const selectPagas = document.getElementById('qtd-pagas');
    
    for(let i = 2; i <= 24; i++) selectTotal.innerHTML += `<option value="${i}">${i}x</option>`;
    for(let i = 0; i <= 24; i++) selectPagas.innerHTML += `<option value="${i}">${i}x</option>`;

    formEmprestimos.addEventListener('submit', (e) => {
        e.preventDefault();
        
        let total = parseInt(document.getElementById('qtd-total').value);
        let pagas = parseInt(document.getElementById('qtd-pagas').value);
        
        if (pagas > total) {
            alert("Erro: O número de parcelas pagas não pode ser maior que o total de parcelas.");
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
