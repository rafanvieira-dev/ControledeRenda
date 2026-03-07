// Base de Dados
let bancoDeDados = JSON.parse(localStorage.getItem('financas_db')) || {
    renda: [],
    fixas: [],
    cartoes: [],
    emprestimos: [],
    acordos: [] // Nova categoria
};

function salvarDados() {
    localStorage.setItem('financas_db', JSON.stringify(bancoDeDados));
    carregarPaginaAtual();
}

function carregarPaginaAtual() {
    if (document.getElementById('resumo-saldo')) renderizarResumo();
    if (document.getElementById('lista-renda')) renderizarLista('renda', 'lista-renda');
    if (document.getElementById('lista-fixas')) renderizarListaFixas();
    if (document.getElementById('lista-cartoes')) renderizarCartoes();
    if (document.getElementById('lista-emprestimos')) renderizarEmprestimos();
    if (document.getElementById('lista-acordos')) renderizarAcordos();
}

// --- UTILITÁRIOS ---
function formatarData(dataString) {
    if(!dataString) return "N/A";
    let partes = dataString.split('-');
    if(partes.length !== 3) return dataString;
    return `${partes[2]}/${partes[1]}/${partes[0]}`; 
}

// --- FUNÇÕES DE RENDERIZAÇÃO ---

function renderizarResumo() {
    let hoje = new Date().getDate(); 

    let totalRenda = bancoDeDados.renda.reduce((acc, item) => acc + item.valor, 0);
    
    let despesasPagas = 0; // Venceu (dia <= hoje)
    let despesasAVencer = 0; // Vai vencer (dia > hoje)
    let dividaTotalLongoPrazo = 0; // Soma de todas as parcelas restantes

    // FIXAS
    bancoDeDados.fixas.forEach(item => {
        let diaVenc = item.diaVencimento || 1;
        if (hoje >= diaVenc) despesasPagas += item.valor;
        else despesasAVencer += item.valor;
    });

    // CARTÕES
    bancoDeDados.cartoes.forEach(item => {
        let diaVenc = item.diaVencimento || 1;
        let parcelasRestantes = item.qtdParcelas - item.parcelasPagas;
        
        if (parcelasRestantes > 0) {
            // Conta apenas 1 parcela para o mês atual
            if (hoje >= diaVenc) despesasPagas += item.valorParcela;
            else despesasAVencer += item.valorParcela;
            
            // Soma na dívida total de longo prazo
            dividaTotalLongoPrazo += (item.valorParcela * parcelasRestantes);
        }
    });

    // EMPRÉSTIMOS
    bancoDeDados.emprestimos.forEach(item => {
        let diaVenc = item.diaVencimento || 1;
        let parcelasRestantes = item.qtdTotal - item.qtdPagas;

        if (parcelasRestantes > 0) {
            if (hoje >= diaVenc) despesasPagas += item.valorParcela;
            else despesasAVencer += item.valorParcela;
            
            dividaTotalLongoPrazo += (item.valorParcela * parcelasRestantes);
        }
    });

    // ACORDOS
    bancoDeDados.acordos.forEach(item => {
        let diaVenc = item.diaVencimento || 1;
        if (item.qtdFaltam > 0) {
            if (hoje >= diaVenc) despesasPagas += item.valorParcela;
            else despesasAVencer += item.valorParcela;
            
            dividaTotalLongoPrazo += (item.valorParcela * item.qtdFaltam);
        }
    });

    document.getElementById('resumo-receitas').innerText = totalRenda.toFixed(2);
    document.getElementById('resumo-despesas').innerText = despesasPagas.toFixed(2);
    document.getElementById('resumo-avencer').innerText = despesasAVencer.toFixed(2);
    
    // O Saldo é a Renda menos o que JÁ VENCEU e o que VAI VENCER este mês
    let saldoAtual = totalRenda - despesasPagas - despesasAVencer;
    document.getElementById('resumo-saldo').innerText = saldoAtual.toFixed(2);

    document.getElementById('resumo-divida-total').innerText = dividaTotalLongoPrazo.toFixed(2);
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

function renderizarListaFixas() {
    const lista = document.getElementById('lista-fixas');
    lista.innerHTML = '';
    bancoDeDados.fixas.forEach((item, index) => {
        lista.innerHTML += `
            <li>
                <div>
                    <strong>${item.descricao}</strong><br>
                    <small>Vence dia: ${item.diaVencimento || 'N/A'}</small>
                </div>
                <div>
                    <span style="margin-right: 15px;">R$ ${item.valor.toFixed(2)}</span>
                    <button class="btn-del" onclick="deletar('fixas', ${index})">X</button>
                </div>
            </li>`;
    });
}

function renderizarCartoes() {
    const conteinerCartoes = document.getElementById('lista-cartoes');
    conteinerCartoes.innerHTML = '';

    let cartoesAgrupados = {};

    bancoDeDados.cartoes.forEach((compra, index) => {
        let nomeUpper = compra.cartao.toUpperCase(); 
        
        if(!cartoesAgrupados[nomeUpper]) {
            cartoesAgrupados[nomeUpper] = { totalMensal: 0, totalDevedor: 0, compras: [] };
        }
        
        let parcelasRestantes = compra.qtdParcelas - compra.parcelasPagas;
        if (parcelasRestantes > 0) {
            cartoesAgrupados[nomeUpper].totalMensal += compra.valorParcela;
            cartoesAgrupados[nomeUpper].totalDevedor += (compra.valorParcela * parcelasRestantes);
        }
        
        cartoesAgrupados[nomeUpper].compras.push({...compra, indexOriginal: index});
    });

    for (let nomeCartao in cartoesAgrupados) {
        let dados = cartoesAgrupados[nomeCartao];

        let htmlFatura = `
            <div class="fatura-cartao">
                <div class="fatura-cabecalho" style="background: #e9ecef; padding: 10px; border-radius: 5px; margin-top: 15px;">
                    <h3>💳 ${nomeCartao}</h3>
                    <div style="display: flex; justify-content: space-between;">
                        <span>Fatura do Mês: <strong>R$ ${dados.totalMensal.toFixed(2)}</strong></span>
                        <span style="color: #dc3545;">Dívida Total: <strong>R$ ${dados.totalDevedor.toFixed(2)}</strong></span>
                    </div>
                </div>
                <ul>
        `;

        dados.compras.forEach(compra => {
            let finalizado = compra.parcelasPagas >= compra.qtdParcelas;
            htmlFatura += `
                <li style="${finalizado ? 'opacity: 0.5; border-left-color: #28a745;' : ''}">
                    <div>
                        <strong>${compra.descricao}</strong> <small style="color:#666;">(Venc: dia ${compra.diaVencimento || 'N/A'})</small><br>
                        <small>Parcela: R$ ${compra.valorParcela.toFixed(2)}</small><br>
                        <small>Progresso: ${compra.parcelasPagas}/${compra.qtdParcelas} pagas</small>
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
        let textoDiaVenc = item.diaVencimento ? ` | Vence dia: <strong>${item.diaVencimento}</strong>` : '';
        let dividaRestante = item.valorParcela * (item.qtdTotal - item.qtdPagas);
        
        lista.innerHTML += `
            <li style="${finalizado ? 'opacity: 0.6; border-left-color: #28a745;' : ''}">
                <div>
                    <strong>${item.descricao}</strong><br>
                    <small>Progresso: ${item.qtdPagas}/${item.qtdTotal} pagas | Parcela: R$ ${item.valorParcela.toFixed(2)}</small><br>
                    <small style="color: #dc3545;">Falta Pagar: R$ ${dividaRestante.toFixed(2)}</small><br>
                    <small style="color: #666;">${textoDiaVenc}</small>
                </div>
                <div class="botoes-acao">
                    ${!finalizado ? `<button class="btn-baixa" onclick="darBaixaEmprestimo(${index})">Pagar 1x</button>` : `<span style="color:#28a745; font-weight:bold; margin-right: 10px;">Quitado!</span>`}
                    <button class="btn-del" onclick="deletar('emprestimos', ${index})">X</button>
                </div>
            </li>`;
    });
}

function renderizarAcordos() {
    const lista = document.getElementById('lista-acordos');
    lista.innerHTML = '';
    if(!bancoDeDados.acordos) bancoDeDados.acordos = []; // Garantia de compatibilidade
    
    bancoDeDados.acordos.forEach((item, index) => {
        let finalizado = item.qtdFaltam <= 0;
        let dividaRestante = item.valorParcela * item.qtdFaltam;
        
        lista.innerHTML += `
            <li style="${finalizado ? 'opacity: 0.6; border-left-color: #28a745;' : ''}">
                <div>
                    <strong>${item.descricao}</strong><br>
                    <small>Faltam: ${item.qtdFaltam} parcelas | Parcela: R$ ${item.valorParcela.toFixed(2)}</small><br>
                    <small style="color: #dc3545;">Dívida Restante: R$ ${dividaRestante.toFixed(2)}</small><br>
                    <small style="color: #666;">Vence dia: <strong>${item.diaVencimento}</strong></small>
                </div>
                <div class="botoes-acao">
                    ${!finalizado ? `<button class="btn-baixa" onclick="darBaixaAcordo(${index})">Pagar 1x</button>` : `<span style="color:#28a745; font-weight:bold; margin-right: 10px;">Quitado!</span>`}
                    <button class="btn-del" onclick="deletar('acordos', ${index})">X</button>
                </div>
            </li>`;
    });
}

// --- AÇÕES ---
function darBaixaCartao(index) {
    let compra = bancoDeDados.cartoes[index];
    if (compra.parcelasPagas < compra.qtdParcelas) {
        compra.parcelasPagas += 1;
        if(compra.parcelasPagas === compra.qtdParcelas) alert('Você pagou a última parcela desta compra!');
    }
    salvarDados();
}

function darBaixaEmprestimo(index) {
    let emp = bancoDeDados.emprestimos[index];
    if (emp.qtdPagas < emp.qtdTotal) {
        emp.qtdPagas += 1;
        if(emp.qtdPagas === emp.qtdTotal) alert('Parabéns! Você pagou a última parcela deste empréstimo!');
    }
    salvarDados();
}

function darBaixaAcordo(index) {
    let acordo = bancoDeDados.acordos[index];
    if (acordo.qtdFaltam > 0) {
        acordo.qtdFaltam -= 1;
        if(acordo.qtdFaltam === 0) alert('Acordo quitado com sucesso!');
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
    bancoDeDados.fixas.push({ 
        descricao: document.getElementById('desc').value, 
        valor: parseFloat(document.getElementById('valor').value),
        diaVencimento: parseInt(document.getElementById('dia-vencimento').value)
    });
    formFixas.reset(); salvarDados();
});

const formCartoes = document.getElementById('form-cartoes');
if(formCartoes) {
    const selectQtd = document.getElementById('qtd');
    for(let i = 1; i <= 48; i++) selectQtd.innerHTML += `<option value="${i}">${i}x</option>`;

    formCartoes.addEventListener('submit', (e) => {
        e.preventDefault();
        
        let valorParcela = parseFloat(document.getElementById('valor-parcela').value);
        let qtd = parseInt(document.getElementById('qtd').value);
        let valorTotal = valorParcela * qtd; 

        bancoDeDados.cartoes.push({
            cartao: document.getElementById('cartao-nome').value.trim(),
            descricao: document.getElementById('desc').value,
            valorTotal: valorTotal,
            valorParcela: valorParcela,
            qtdParcelas: qtd,
            parcelasPagas: 0, 
            dataCompra: document.getElementById('data-compra').value,
            diaVencimento: parseInt(document.getElementById('dia-vencimento').value)
        });
        formCartoes.reset(); salvarDados();
    });
}

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
        let diaVenc = parseInt(document.getElementById('dia-vencimento').value); 
        
        bancoDeDados.emprestimos.push({
            descricao: document.getElementById('desc').value, 
            valorTotal: parseFloat(document.getElementById('valor-total').value),
            valorParcela: parseFloat(document.getElementById('valor-parcela').value), 
            qtdTotal: total,
            qtdPagas: pagas,
            diaVencimento: diaVenc
        });
        formEmprestimos.reset(); salvarDados();
    });
}

const formAcordos = document.getElementById('form-acordos');
if(formAcordos) {
    formAcordos.addEventListener('submit', (e) => {
        e.preventDefault();
        bancoDeDados.acordos.push({
            descricao: document.getElementById('desc').value, 
            valorParcela: parseFloat(document.getElementById('valor-parcela').value), 
            qtdFaltam: parseInt(document.getElementById('qtd-faltam').value),
            diaVencimento: parseInt(document.getElementById('dia-vencimento').value)
        });
        formAcordos.reset(); salvarDados();
    });
}

// Inicia
carregarPaginaAtual();
