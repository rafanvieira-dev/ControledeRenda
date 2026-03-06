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

// Descobre qual página está aberta e renderiza os dados certos
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
    let totalEmprestimos = bancoDeDados.emprestimos.reduce((acc, item) => acc + item.valorParcela, 0);
    
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
                    <button class="btn-baixa" onclick="darBaixa('cartoes', ${index})">Pagar 1x</button>
                    <button class="btn-del" onclick="deletar('cartoes', ${index})">X</button>
                </div>
            </li>`;
    });
}

function renderizarEmprestimos() {
    const lista = document.getElementById('lista-emprestimos');
    lista.innerHTML = '';
    bancoDeDados.emprestimos.forEach((item, index) => {
        lista.innerHTML += `
            <li>
                <div><strong>${item.descricao}</strong><br><small>Restam: ${item.qtdParcelas}x de R$ ${item.valorParcela.toFixed(2)}</small></div>
                <div class="botoes-acao">
                    <button class="btn-baixa" onclick="darBaixa('emprestimos', ${index})">Pagar 1x</button>
                    <button class="btn-del" onclick="deletar('emprestimos', ${index})">X</button>
                </div>
            </li>`;
    });
}

// --- AÇÕES ---
function darBaixa(categoria, index) {
    if (bancoDeDados[categoria][index].qtdParcelas > 1) {
        bancoDeDados[categoria][index].qtdParcelas -= 1;
    } else {
        alert('Última parcela! Removido.');
        bancoDeDados[categoria].splice(index, 1);
    }
    salvarDados();
}

function deletar(categoria, index) {
    if(confirm('Apagar este registro?')) {
        bancoDeDados[categoria].splice(index, 1);
        salvarDados();
    }
}

// --- EVENTOS DE FORMULÁRIO (Protegidos para não dar erro se não existirem na página) ---
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
if(formEmprestimos) formEmprestimos.addEventListener('submit', (e) => {
    e.preventDefault();
    bancoDeDados.emprestimos.push({
        descricao: document.getElementById('desc').value, valorParcela: parseFloat(document.getElementById('valor').value), 
        qtdParcelas: parseInt(document.getElementById('qtd').value)
    });
    formEmprestimos.reset(); salvarDados();
});

// Inicia
carregarPaginaAtual();
