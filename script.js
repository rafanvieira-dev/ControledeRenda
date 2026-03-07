import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBqVhJ76IvwgcV7xWiYttE-oVZEhzCEXFQ",
    authDomain: "controlederenda-89eaa.firebaseapp.com",
    projectId: "controlederenda-89eaa",
    storageBucket: "controlederenda-89eaa.firebasestorage.app",
    messagingSenderId: "524591368682",
    appId: "1:524591368682:web:3f295577a7f757036b0a93"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

let bancoDeDados = { renda: [], fixas: [], cartoes: [], emprestimos: [], acordos: [] };
let docRef = null; 

// --- CONTROLO DE ECRÃS E AUTENTICAÇÃO ---
onAuthStateChanged(auth, async (user) => {
    const loadingSec = document.getElementById('loading-section');
    const loginSec = document.getElementById('login-section');
    const appCont = document.getElementById('app-container');
    const nameElement = document.getElementById('user-name');

    if (user) {
        try {
            if(nameElement) {
                let nome = user.displayName ? user.displayName.split(" ")[0] : "Utilizador";
                nameElement.innerText = "Olá, " + nome;
            }
            docRef = doc(db, "usuarios", user.uid);
            await inicializarApp();
        } catch (erro) {
            console.error("Erro crítico ao carregar dados:", erro);
        } finally {
            if(loadingSec) loadingSec.style.display = 'none';
            if(loginSec) loginSec.style.display = 'none';
            if(appCont) appCont.style.display = 'block';
        }
    } else {
        if(loadingSec) loadingSec.style.display = 'none';
        if(appCont) appCont.style.display = 'none';
        if(loginSec) loginSec.style.display = 'block';
        docRef = null;
    }
});

window.loginComGoogle = () => {
    signInWithPopup(auth, provider).catch((error) => alert("Erro ao fazer login: " + error.message));
};

window.sair = () => {
    signOut(auth).then(() => window.location.href = "index.html");
};

// --- BASE DE DADOS (Firestore) ---
async function inicializarApp() {
    if (!docRef) return;
    try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            let dadosNuvem = docSnap.data();
            bancoDeDados = {
                renda: dadosNuvem.renda || [], fixas: dadosNuvem.fixas || [],
                cartoes: dadosNuvem.cartoes || [], emprestimos: dadosNuvem.emprestimos || [], acordos: dadosNuvem.acordos || []
            };
        } else {
            await salvarDadosNuvem(false); 
        }
        carregarPaginaAtual();
    } catch (error) {
        console.error("Erro Firestore:", error); 
    }
}

async function salvarDadosNuvem(mostrarAlerta = false) {
    if (!docRef) return;
    try {
        await setDoc(docRef, bancoDeDados);
        if(mostrarAlerta) alert("Guardado com sucesso! ✔️"); 
        carregarPaginaAtual();
    } catch (error) {
        console.error(error); alert("Erro ao guardar na nuvem.");
    }
}

function carregarPaginaAtual() {
    try {
        if (document.getElementById('resumo-saldo')) renderizarResumo();
        if (document.getElementById('lista-renda')) renderizarLista('renda', 'lista-renda');
        if (document.getElementById('lista-fixas')) renderizarListaFixas();
        if (document.getElementById('lista-cartoes')) renderizarCartoes();
        if (document.getElementById('lista-emprestimos')) renderizarEmprestimos();
        if (document.getElementById('lista-acordos')) renderizarAcordos();
    } catch (e) {
        console.error("Erro a desenhar a página:", e);
    }
}

// --- FUNÇÕES DE RENDERIZAÇÃO ---
function renderizarResumo() {
    let hoje = new Date().getDate(); 
    let totalRenda = bancoDeDados.renda.reduce((acc, item) => acc + (item.valor || 0), 0);
    let despesasPagas = 0; let despesasAVencer = 0; let dividaTotalLongoPrazo = 0; 
    let previsaoProximoMes = 0;

    bancoDeDados.fixas.forEach(item => {
        let diaVenc = item.diaVencimento || 1;
        if (hoje >= diaVenc) despesasPagas += (item.valor || 0); else despesasAVencer += (item.valor || 0);
        previsaoProximoMes += (item.valor || 0);
    });

    bancoDeDados.cartoes.forEach(item => {
        let diaVenc = item.diaVencimento || 1;
        let parcelasRestantes = (item.qtdParcelas || 0) - (item.parcelasPagas || 0);
        if (parcelasRestantes > 0) {
            if (hoje >= diaVenc) despesasPagas += (item.valorParcela || 0); else despesasAVencer += (item.valorParcela || 0);
            dividaTotalLongoPrazo += ((item.valorParcela || 0) * parcelasRestantes);
            if (parcelasRestantes > 1) previsaoProximoMes += (item.valorParcela || 0);
        }
    });

    bancoDeDados.emprestimos.forEach(item => {
        let diaVenc = item.diaVencimento || 1;
        let parcelasRestantes = (item.qtdTotal || 0) - (item.qtdPagas || 0);
        if (parcelasRestantes > 0) {
            if (hoje >= diaVenc) despesasPagas += (item.valorParcela || 0); else despesasAVencer += (item.valorParcela || 0);
            dividaTotalLongoPrazo += ((item.valorParcela || 0) * parcelasRestantes);
            if (parcelasRestantes > 1) previsaoProximoMes += (item.valorParcela || 0);
        }
    });

    bancoDeDados.acordos.forEach(item => {
        let diaVenc = item.diaVencimento || 1;
        let parcelasRestantes = item.qtdFaltam || 0;
        if (parcelasRestantes > 0) {
            if (hoje >= diaVenc) despesasPagas += (item.valorParcela || 0); else despesasAVencer += (item.valorParcela || 0);
            dividaTotalLongoPrazo += ((item.valorParcela || 0) * parcelasRestantes);
            if (parcelasRestantes > 1) previsaoProximoMes += (item.valorParcela || 0);
        }
    });

    document.getElementById('resumo-receitas').innerText = totalRenda.toFixed(2);
    document.getElementById('resumo-despesas').innerText = despesasPagas.toFixed(2);
    document.getElementById('resumo-avencer').innerText = despesasAVencer.toFixed(2);
    document.getElementById('resumo-saldo').innerText = (totalRenda - despesasPagas - despesasAVencer).toFixed(2);
    document.getElementById('resumo-divida-total').innerText = dividaTotalLongoPrazo.toFixed(2);
    
    let campoProximoMes = document.getElementById('resumo-proximo-mes');
    if (campoProximoMes) campoProximoMes.innerText = previsaoProximoMes.toFixed(2);
}

function renderizarLista(categoria, idLista) {
    const lista = document.getElementById(idLista);
    if(!lista) return;
    lista.innerHTML = '';
    bancoDeDados[categoria].forEach((item, index) => {
        lista.innerHTML += `
            <li>
                <strong>${item.descricao || 'Sem descrição'}</strong> 
                <div>
                    <span style="margin-right: 15px; font-weight: bold; color: var(--primary);">R$ ${(item.valor || 0).toFixed(2)}</span> 
                    <button class="btn-del" onclick="deletar('${categoria}', ${index})">X</button>
                </div>
            </li>`;
    });
}

function renderizarListaFixas() {
    const lista = document.getElementById('lista-fixas');
    if(!lista) return;
    lista.innerHTML = '';
    bancoDeDados.fixas.forEach((item, index) => {
        lista.innerHTML += `
            <li>
                <div><strong>${item.descricao || 'Sem descrição'}</strong><br><small>Vence dia: ${item.diaVencimento || 'N/A'}</small></div>
                <div style="display: flex; align-items: center;"><span style="margin-right: 15px; font-weight: bold; color: var(--primary);">R$ ${(item.valor || 0).toFixed(2)}</span><button class="btn-del" onclick="deletar('fixas', ${index})">X</button></div>
            </li>`;
    });
}

function renderizarCartoes() {
    const conteinerCartoes = document.getElementById('lista-cartoes');
    if(!conteinerCartoes) return;
    conteinerCartoes.innerHTML = '';
    let cartoesAgrupados = {};

    bancoDeDados.cartoes.forEach((compra, index) => {
        let nomeUpper = (compra.cartao || 'Desconhecido').toUpperCase(); 
        if(!cartoesAgrupados[nomeUpper]) cartoesAgrupados[nomeUpper] = { totalMensal: 0, totalDevedor: 0, compras: [] };
        
        let parcelasRestantes = (compra.qtdParcelas || 0) - (compra.parcelasPagas || 0);
        if (parcelasRestantes > 0) {
            cartoesAgrupados[nomeUpper].totalMensal += (compra.valorParcela || 0);
            cartoesAgrupados[nomeUpper].totalDevedor += ((compra.valorParcela || 0) * parcelasRestantes);
        }
        cartoesAgrupados[nomeUpper].compras.push({...compra, indexOriginal: index});
    });

    for (let nomeCartao in cartoesAgrupados) {
        let dados = cartoesAgrupados[nomeCartao];
        
        // NOVO: Adicionado botão de pagar fatura inteira do mês
        let botaoPagarFatura = dados.totalMensal > 0 
            ? `<button class="btn-baixa" style="background: var(--success);" onclick="pagarFaturaCartao('${nomeCartao}')">✓ Pagar Fatura do Mês</button>` 
            : `<span style="color: var(--success); font-weight: bold;">Fatura Paga!</span>`;

        let htmlFatura = `<div class="fatura-cartao">
            <div class="fatura-cabecalho">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin: 0;">💳 ${nomeCartao}</h3>
                    ${botaoPagarFatura}
                </div>
                <div style="display: flex; justify-content: space-between;">
                    <span>Fatura do Mês: <strong>R$ ${dados.totalMensal.toFixed(2)}</strong></span>
                    <span style="color: var(--danger);">Dívida Total: <strong>R$ ${dados.totalDevedor.toFixed(2)}</strong></span>
                </div>
            </div>
            <ul style="border: 1px solid #E5E7EB; border-top: none; border-radius: 0 0 10px 10px; padding: 10px;">`;
            
        dados.compras.forEach(compra => {
            let finalizado = compra.parcelasPagas >= compra.qtdParcelas;
            htmlFatura += `<li style="${finalizado ? 'opacity: 0.5; border-left-color: var(--success);' : ''}"><div><strong>${compra.descricao || ''}</strong> <small style="color:var(--text-muted);">(${compra.diaVencimento ? `Venc: dia ${compra.diaVencimento}` : 'N/A'})</small><br><small>Parcela: R$ ${(compra.valorParcela||0).toFixed(2)}</small><br><small>Progresso: ${compra.parcelasPagas||0}/${compra.qtdParcelas||0} pagas</small></div><div class="botoes-acao">${!finalizado ? `<button class="btn-baixa" onclick="darBaixaCartao(${compra.indexOriginal})">Pagar 1x</button>` : `<span style="color:var(--success); font-weight:bold; margin-right: 10px;">Quitada!</span>`}<button class="btn-del" onclick="deletar('cartoes', ${compra.indexOriginal})">X</button></div></li>`;
        });
        htmlFatura += `</ul></div>`;
        conteinerCartoes.innerHTML += htmlFatura;
    }
}

function renderizarEmprestimos() {
    const lista = document.getElementById('lista-emprestimos');
    if(!lista) return;
    lista.innerHTML = '';
    bancoDeDados.emprestimos.forEach((item, index) => {
        let finalizado = item.qtdPagas >= item.qtdTotal;
        let textoDiaVenc = item.diaVencimento ? ` | Vence dia: <strong>${item.diaVencimento}</strong>` : '';
        let dividaRestante = (item.valorParcela || 0) * ((item.qtdTotal || 0) - (item.qtdPagas || 0));
        lista.innerHTML += `<li style="${finalizado ? 'opacity: 0.6; border-left-color: var(--success);' : ''}"><div><strong>${item.descricao || ''}</strong><br><small>Progresso: ${item.qtdPagas||0}/${item.qtdTotal||0} pagas | Parcela: R$ ${(item.valorParcela||0).toFixed(2)}</small><br><small style="color: var(--danger);">Falta Pagar: R$ ${dividaRestante.toFixed(2)}</small><br><small style="color: var(--text-muted);">${textoDiaVenc}</small></div><div class="botoes-acao">${!finalizado ? `<button class="btn-baixa" onclick="darBaixaEmprestimo(${index})">Pagar 1x</button>` : `<span style="color:var(--success); font-weight:bold; margin-right: 10px;">Quitado!</span>`}<button class="btn-del" onclick="deletar('emprestimos', ${index})">X</button></div></li>`;
    });
}

function renderizarAcordos() {
    const lista = document.getElementById('lista-acordos');
    if(!lista) return;
    lista.innerHTML = '';
    bancoDeDados.acordos.forEach((item, index) => {
        let finalizado = item.qtdFaltam <= 0;
        let dividaRestante = (item.valorParcela || 0) * (item.qtdFaltam || 0);
        lista.innerHTML += `<li style="${finalizado ? 'opacity: 0.6; border-left-color: var(--success);' : ''}"><div><strong>${item.descricao || ''}</strong><br><small>Faltam: ${item.qtdFaltam||0} parcelas | Parcela: R$ ${(item.valorParcela||0).toFixed(2)}</small><br><small style="color: var(--danger);">Dívida Restante: R$ ${dividaRestante.toFixed(2)}</small><br><small style="color: var(--text-muted);">Vence dia: <strong>${item.diaVencimento||'N/A'}</strong></small></div><div class="botoes-acao">${!finalizado ? `<button class="btn-baixa" onclick="darBaixaAcordo(${index})">Pagar 1x</button>` : `<span style="color:var(--success); font-weight:bold; margin-right: 10px;">Quitado!</span>`}<button class="btn-del" onclick="deletar('acordos', ${index})">X</button></div></li>`;
    });
}

// --- AÇÕES COM SALVAMENTO NA NUVEM ---
window.darBaixaCartao = async function(index) {
    bancoDeDados.cartoes[index].parcelasPagas += 1; await salvarDadosNuvem(false);
}

// NOVO: Função para pagar a fatura inteira do mês do cartão
window.pagarFaturaCartao = async function(nomeCartao) {
    if(confirm(`Deseja pagar a fatura do mês do cartão ${nomeCartao}? Isso vai dar baixa em 1 parcela de TODAS as compras ativas deste cartão.`)) {
        let alterou = false;
        bancoDeDados.cartoes.forEach(compra => {
            let nome = (compra.cartao || 'Desconhecido').toUpperCase();
            if (nome === nomeCartao && compra.parcelasPagas < compra.qtdParcelas) {
                compra.parcelasPagas += 1;
                alterou = true;
            }
        });
        if(alterou) await salvarDadosNuvem(false);
    }
}

window.darBaixaEmprestimo = async function(index) {
    bancoDeDados.emprestimos[index].qtdPagas += 1; await salvarDadosNuvem(false);
}
window.darBaixaAcordo = async function(index) {
    bancoDeDados.acordos[index].qtdFaltam -= 1; await salvarDadosNuvem(false);
}
window.deletar = async function(categoria, index) {
    if(confirm('Apagar este registro?')) { bancoDeDados[categoria].splice(index, 1); await salvarDadosNuvem(false); }
}

// --- EVENTOS DE FORMULÁRIO ---
const formRenda = document.getElementById('form-renda');
if(formRenda) formRenda.addEventListener('submit', async (e) => {
    e.preventDefault();
    bancoDeDados.renda.push({ descricao: document.getElementById('desc').value, valor: parseFloat(document.getElementById('valor').value) });
    formRenda.reset(); await salvarDadosNuvem(true);
});

const formFixas = document.getElementById('form-fixas');
if(formFixas) formFixas.addEventListener('submit', async (e) => {
    e.preventDefault();
    bancoDeDados.fixas.push({ descricao: document.getElementById('desc').value, valor: parseFloat(document.getElementById('valor').value), diaVencimento: parseInt(document.getElementById('dia-vencimento').value) });
    formFixas.reset(); await salvarDadosNuvem(true);
});

const formCartoes = document.getElementById('form-cartoes');
if(formCartoes) {
    const selectQtd = document.getElementById('qtd');
    for(let i = 1; i <= 48; i++) selectQtd.innerHTML += `<option value="${i}">${i}x</option>`;
    formCartoes.addEventListener('submit', async (e) => {
        e.preventDefault();
        let valorParcela = parseFloat(document.getElementById('valor-parcela').value);
        let qtd = parseInt(document.getElementById('qtd').value);
        bancoDeDados.cartoes.push({
            cartao: document.getElementById('cartao-nome').value.trim(), descricao: document.getElementById('desc').value,
            valorTotal: valorParcela * qtd, valorParcela: valorParcela, qtdParcelas: qtd, parcelasPagas: 0, 
            dataCompra: document.getElementById('data-compra').value, diaVencimento: parseInt(document.getElementById('dia-vencimento').value)
        });
        formCartoes.reset(); await salvarDadosNuvem(true);
    });
}

const formEmprestimos = document.getElementById('form-emprestimos');
if(formEmprestimos) {
    const selectTotal = document.getElementById('qtd-total');
    const selectPagas = document.getElementById('qtd-pagas');
    for(let i = 2; i <= 360; i++) selectTotal.innerHTML += `<option value="${i}">${i}x</option>`;
    for(let i = 0; i <= 360; i++) selectPagas.innerHTML += `<option value="${i}">${i}x</option>`;
    formEmprestimos.addEventListener('submit', async (e) => {
        e.preventDefault();
        bancoDeDados.emprestimos.push({
            descricao: document.getElementById('desc').value, valorTotal: parseFloat(document.getElementById('valor-total').value),
            valorParcela: parseFloat(document.getElementById('valor-parcela').value), qtdTotal: parseInt(document.getElementById('qtd-total').value),
            qtdPagas: parseInt(document.getElementById('qtd-pagas').value), diaVencimento: parseInt(document.getElementById('dia-vencimento').value)
        });
        formEmprestimos.reset(); await salvarDadosNuvem(true);
    });
}

const formAcordos = document.getElementById('form-acordos');
if(formAcordos) {
    formAcordos.addEventListener('submit', async (e) => {
        e.preventDefault();
        bancoDeDados.acordos.push({
            descricao: document.getElementById('desc').value, valorParcela: parseFloat(document.getElementById('valor-parcela').value), 
            qtdFaltam: parseInt(document.getElementById('qtd-faltam').value), diaVencimento: parseInt(document.getElementById('dia-vencimento').value)
        });
        formAcordos.reset(); await salvarDadosNuvem(true);
    });
}
