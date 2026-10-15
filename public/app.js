const API_URL = '/api';

// Elementos do DOM
const form = document.getElementById('product-form');
const formAlt = document.getElementById('product-form-alt');
const tbody = document.getElementById('products-body');
const sumCount = document.getElementById('sum-count');
const sumValue = document.getElementById('sum-value');
const searchInput = document.getElementById('search-input');
const reloadBtn = document.getElementById('reload-btn');
const messageDiv = document.getElementById('form-message');
const messageDivAlt = document.getElementById('form-message-alt');
const limitAlertsBody = document.getElementById('limit-alerts-body');
const topSaidasBody = document.getElementById('top-saidas-body');
const topSaidasBodyAlt = document.getElementById('top-saidas-body-alt');
const topEntradasBody = document.getElementById('top-entradas-body');
const topEntradasBodyAlt = document.getElementById('top-entradas-body-alt');
const historyBody = document.getElementById('history-body');
const historyBodyAlt = document.getElementById('history-body-alt');
const movimentacaoBody = document.getElementById('movimentacao-body');
const dataInicialMovimentacao = document.getElementById('data-inicial-movimentacao');
const dataFinalMovimentacao = document.getElementById('data-final-movimentacao');
const btnConsultarMovimentacoes = document.getElementById('btn-consultar-movimentacoes');

let todosProdutos = [];

// Exibir mensagens na div do formulário
function exibirMensagem(texto, tipo = 'success', alvo = messageDiv) {
  if (!alvo) return;
  alvo.textContent = texto;
  alvo.className = `message ${tipo}`;
  setTimeout(() => {
    alvo.textContent = '';
    alvo.className = 'message';
  }, 4000);
}

// Formatador de moeda para Real (R$)
const formatarMoeda = (valor) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor || 0);
};

const formatarData = (data) => {
  if (!data) return '—';

  const valor = data.includes('T') ? data : `${data}T12:00:00`;
  const dt = new Date(valor);

  if (Number.isNaN(dt.getTime())) return '—';

  return new Intl.DateTimeFormat('pt-BR').format(dt);
};

function obterStatusProduto(produto) {
  const quantidade = Number(produto.quantidade) || 0;

  if (quantidade <= 0) {
    return { texto: 'Sem estoque', classe: 'status-critical' };
  }

  if (quantidade >= 100) {
    return { texto: 'Limite', classe: 'status-warning' };
  }

  return { texto: 'Ativo', classe: 'status-ok' };
}

function atualizarResumo(lista) {
  const produtos = Array.isArray(lista) ? lista : [];
  const totalItens = produtos.reduce((acc, prod) => acc + (Number(prod.quantidade) || 0), 0);
  const valorTotal = produtos.reduce((acc, prod) => acc + ((Number(prod.quantidade) || 0) * (Number(prod.valor) || 0)), 0);
  const alertas = produtos.filter((prod) => (Number(prod.quantidade) || 0) > 100);

  const totalCard = document.getElementById('sidebar-total');
  const alertCard = document.getElementById('alert-count');

  if (totalCard) totalCard.textContent = produtos.length;
  if (sumCount) sumCount.textContent = totalItens;
  if (sumValue) sumValue.textContent = formatarMoeda(valorTotal);
  if (alertCard) alertCard.textContent = alertas.length;

  const cardAlerta = document.querySelector('.stat-card:last-child');
  if (cardAlerta) {
    cardAlerta.classList.toggle('urgent', alertas.length > 0);
  }
}

function renderizarAlertasLimite(lista) {
  if (!limitAlertsBody) return;

  const produtosAcima = (Array.isArray(lista) ? lista : []).filter((prod) => (Number(prod.quantidade) || 0) > 100);

  if (!produtosAcima.length) {
    limitAlertsBody.innerHTML = `
      <tr>
        <td colspan="4" class="alert-empty">Nenhum produto acima do limite de 100 unidades.</td>
      </tr>
    `;
    return;
  }

  limitAlertsBody.innerHTML = produtosAcima
    .map((prod) => `
      <tr>
        <td>#${prod.id}</td>
        <td><strong>${prod.nome}</strong></td>
        <td>${Number(prod.quantidade) || 0}</td>
        <td>${prod.categoria || '-'}</td>
      </tr>
    `)
    .join('');
}

function preencherTabelaResumo(tableBody, itens, tipo) {
  if (!tableBody) return;

  if (!Array.isArray(itens) || !itens.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="3" class="alert-empty">Nenhum dado para ${tipo}.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = itens
    .map((item) => {
      const nome = item.nome_do_produto || item.nome || 'Produto';
      const quantidade = Number(item.quantidade_total_de_saidas ?? item.quantidade_total_de_entradas ?? item.quantidade ?? 0);
      const valor = Number(item.valor_total_financeiro_das_saidas ?? item.valor_total_financeiro_das_entradas ?? 0);

      return `
        <tr>
          <td><strong>${nome}</strong></td>
          <td>${quantidade}</td>
          <td>${formatarMoeda(valor)}</td>
        </tr>
      `;
    })
    .join('');
}

function preencherHistoricoEmTabela(tableBody, itens) {
  if (!tableBody) return;

  if (!Array.isArray(itens) || !itens.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="alert-empty">Nenhuma movimentação registrada.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = itens
    .map((item) => `
      <tr>
        <td>${formatarData(item.datas)}</td>
        <td><span class="movement ${item.tipo === 'entrada' ? 'entry' : 'exit'}">${item.tipo}</span></td>
        <td>${item.nome_do_produto}</td>
        <td>${item.quantidade}</td>
        <td>${item.categoria || '-'}</td>
      </tr>
    `)
    .join('');
}

function preencherHistorico(itens) {
  preencherHistoricoEmTabela(historyBody, itens);
}

function preencherMovimentacoes(itens) {
  if (!movimentacaoBody) return;

  if (!Array.isArray(itens) || !itens.length) {
    movimentacaoBody.innerHTML = `
      <tr>
        <td colspan="7" class="alert-empty">Nenhuma movimentação encontrada para o período informado.</td>
      </tr>
    `;
    return;
  }

  movimentacaoBody.innerHTML = itens
    .map((item) => {
      const entradas = Number(item.total_de_entradas ?? 0);
      const saidas = Number(item.total_de_saidas ?? 0);
      const saldo = entradas - saidas;
      const valorEntradas = Number(item.valor_total_financeiro_das_entradas ?? 0);
      const valorSaidas = Number(item.valor_financeiro_das_saidas ?? 0);

      return `
        <tr>
          <td><strong>${item.nome_do_produto || 'Produto'}</strong></td>
          <td>${item.unidade_medida || '-'}</td>
          <td>${entradas}</td>
          <td>${saidas}</td>
          <td>${saldo}</td>
          <td>${formatarMoeda(valorEntradas)}</td>
          <td>${formatarMoeda(valorSaidas)}</td>
        </tr>
      `;
    })
    .join('');
}

// Renderizar tabela na tela
function renderizarTabela(lista) {
  if (!tbody) {
    atualizarResumo(Array.isArray(lista) ? lista : []);
    return;
  }

  tbody.innerHTML = '';

  if (!Array.isArray(lista) || lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; color: var(--text-muted, #a091c4); padding: 20px;">
          Nenhum produto encontrado.
        </td>
      </tr>`;
    atualizarResumo([]);
    return;
  }

  lista.forEach((prod) => {
    const qtd = Number(prod.quantidade) || 0;
    const val = Number(prod.valor) || 0;
    const status = obterStatusProduto(prod);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>#${prod.id}</td>
      <td><strong>${prod.nome}</strong></td>
      <td>${qtd}</td>
      <td>${formatarMoeda(val)}</td>
      <td>${prod.categoria}</td>
      <td>${prod.unidade_medida}</td>
      <td>${formatarData(prod.ultima_movimentacao)}</td>
      <td>
        <span class="status-badge ${status.classe}">${status.texto}</span>
      </td>
      <td>
        <div class="table-actions">
          <input type="number" class="qty-adjust" min="1" value="1" aria-label="Quantidade para movimentação de ${prod.nome}" />
          <button class="btn-move btn-entry" type="button" data-id="${prod.id}" data-tipo="entrada">+ Entrada</button>
          <button class="btn-move btn-exit" type="button" data-id="${prod.id}" data-tipo="saida">- Saída</button>
          <button class="btn-delete" type="button" data-id="${prod.id}">Excluir</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  atualizarResumo(lista);
  renderizarAlertasLimite(lista);
}


// 1. Carregar produtos do backend
async function carregarProdutos() {
  try {
    const res = await fetch(`${API_URL}/listar`);
    if (!res.ok) throw new Error(`Status: ${res.status}`);

    todosProdutos = await res.json();
    renderizarTabela(todosProdutos);
  } catch (err) {
    console.error('Erro ao carregar produtos:', err);
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; color: var(--danger, #ff8b9a); padding: 20px;">
            Erro ao conectar com o banco de dados.
          </td>
        </tr>`;
    }
  }
}

async function carregarEstatisticas() {
  try {
    const [saidas, entradas, historico] = await Promise.all([
      fetch(`${API_URL}/maiores-saidas`).then((res) => res.ok ? res.json() : Promise.reject(new Error('Erro ao carregar saídas'))),
      fetch(`${API_URL}/maiores-entradas`).then((res) => res.ok ? res.json() : Promise.reject(new Error('Erro ao carregar entradas'))),
      fetch(`${API_URL}/historico`).then((res) => res.ok ? res.json() : Promise.reject(new Error('Erro ao carregar histórico'))),
    ]);

    preencherTabelaResumo(topSaidasBody, saidas, 'saídas');
    preencherTabelaResumo(topEntradasBody, entradas, 'entradas');
    preencherHistorico(historico);

    if (topSaidasBodyAlt) preencherTabelaResumo(topSaidasBodyAlt, saidas, 'saídas');
    if (topEntradasBodyAlt) preencherTabelaResumo(topEntradasBodyAlt, entradas, 'entradas');
    if (historyBodyAlt) preencherHistoricoEmTabela(historyBodyAlt, historico);
    await carregarMovimentacoes();
  } catch (err) {
    console.error('Erro ao carregar estatísticas:', err);
    if (topSaidasBody) topSaidasBody.innerHTML = '<tr><td colspan="3" class="alert-empty">Erro ao carregar saídas.</td></tr>';
    if (topEntradasBody) topEntradasBody.innerHTML = '<tr><td colspan="3" class="alert-empty">Erro ao carregar entradas.</td></tr>';
    if (historyBody) historyBody.innerHTML = '<tr><td colspan="5" class="alert-empty">Erro ao carregar histórico.</td></tr>';
    if (topSaidasBodyAlt) topSaidasBodyAlt.innerHTML = '<tr><td colspan="3" class="alert-empty">Erro ao carregar saídas.</td></tr>';
    if (topEntradasBodyAlt) topEntradasBodyAlt.innerHTML = '<tr><td colspan="3" class="alert-empty">Erro ao carregar entradas.</td></tr>';
    if (historyBodyAlt) historyBodyAlt.innerHTML = '<tr><td colspan="5" class="alert-empty">Erro ao carregar histórico.</td></tr>';
  }
}

function formatarDataParaInput(data) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function inicializarDatasMovimentacao() {
  if (!dataInicialMovimentacao || !dataFinalMovimentacao) return;
  const hoje = new Date();
  const inicioPadrao = new Date(hoje);
  inicioPadrao.setDate(inicioPadrao.getDate() - 30);
  if (!dataInicialMovimentacao.value) dataInicialMovimentacao.value = formatarDataParaInput(inicioPadrao);
  if (!dataFinalMovimentacao.value) dataFinalMovimentacao.value = formatarDataParaInput(hoje);
  dataFinalMovimentacao.min = dataInicialMovimentacao.value;
  dataInicialMovimentacao.max = dataFinalMovimentacao.value;
}

async function carregarMovimentacoes() {
  inicializarDatasMovimentacao();
  const inicio = dataInicialMovimentacao ? dataInicialMovimentacao.value : '';
  const fim = dataFinalMovimentacao ? dataFinalMovimentacao.value : '';

  if (!inicio || !fim) {
    if (movimentacaoBody) movimentacaoBody.innerHTML = '<tr><td colspan="7" class="alert-empty">Selecione as datas para consultar.</td></tr>';
    return;
  }
  if (inicio > fim) {
    if (movimentacaoBody) movimentacaoBody.innerHTML = '<tr><td colspan="7" class="alert-empty">A data inicial deve ser anterior ou igual � data final.</td></tr>';
    return;
  }

  try {
    const res = await fetch(`${API_URL}/movimentacoes?data_inicial=${encodeURIComponent(inicio)}&data_final=${encodeURIComponent(fim)}`);
    if (!res.ok) throw new Error('Erro ao consultar movimenta��es');
    preencherMovimentacoes(await res.json());
  } catch (err) {
    console.error('Erro ao carregar movimenta��es do per�odo:', err);
    if (movimentacaoBody) movimentacaoBody.innerHTML = '<tr><td colspan="7" class="alert-empty">Erro ao consultar movimenta��es.</td></tr>';
  }
}

// 2. Busca por nome ou categoria em tempo real
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    const termo = e.target.value.toLowerCase().trim();
    const filtrados = todosProdutos.filter((prod) =>
      (prod.nome && prod.nome.toLowerCase().includes(termo)) ||
      (prod.categoria && prod.categoria.toLowerCase().includes(termo))
    );
    renderizarTabela(filtrados);
  });
}

// 3. Botão de Recarregar
if (reloadBtn) {
  reloadBtn.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    carregarProdutos();
  });
}

if (dataInicialMovimentacao && dataFinalMovimentacao) {
  dataInicialMovimentacao.addEventListener('change', () => {
    dataFinalMovimentacao.min = dataInicialMovimentacao.value;
    if (dataFinalMovimentacao.value && dataFinalMovimentacao.value < dataInicialMovimentacao.value) {
      dataFinalMovimentacao.value = dataInicialMovimentacao.value;
    }
  });
  dataFinalMovimentacao.addEventListener('change', () => {
    dataInicialMovimentacao.max = dataFinalMovimentacao.value;
    if (dataInicialMovimentacao.value && dataInicialMovimentacao.value > dataFinalMovimentacao.value) {
      dataInicialMovimentacao.value = dataFinalMovimentacao.value;
    }
  });
}
if (btnConsultarMovimentacoes) {
  btnConsultarMovimentacoes.addEventListener('click', () => {
    carregarMovimentacoes();
  });
}

async function movimentarEstoque(id, tipo, quantidade) {
  const numero = Number(quantidade);

  if (!id || !Number.isFinite(numero) || numero <= 0) {
    exibirMensagem('Informe uma quantidade válida para movimentar o estoque.', 'error');
    return;
  }

  try {
    const res = await fetch(`${API_URL}/${tipo}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, quantidade: numero })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || `Erro ao registrar ${tipo === 'entrada' ? 'entrada' : 'saída'} do produto.`);
    }

    exibirMensagem(data.message || 'Movimentação registrada com sucesso.', 'success');
    await carregarProdutos();
    await carregarEstatisticas();
  } catch (err) {
    console.error('Erro na movimentação do estoque:', err);
    exibirMensagem(err.message || 'Erro ao movimentar estoque.', 'error');
  }
}

// 4. Excluir e movimentar produto
if (tbody) {
  tbody.addEventListener('click', async (event) => {
    const moveButton = event.target.closest('.btn-move');
    if (moveButton) {
      const id = moveButton.dataset.id;
      const tipo = moveButton.dataset.tipo;
      const input = moveButton.closest('.table-actions')?.querySelector('.qty-adjust');
      const quantidade = input ? Number(input.value) : 1;
      await movimentarEstoque(id, tipo, quantidade);
      return;
    }

    const deleteButton = event.target.closest('.btn-delete');
    if (!deleteButton) return;

    const id = deleteButton.dataset.id;
    const produto = todosProdutos.find((item) => String(item.id) === String(id));

    if (!produto) return;

    const confirmar = window.confirm(`Deseja realmente excluir o produto "${produto.nome}"?`);
    if (!confirmar) return;

    try {
      const res = await fetch(`${API_URL}/deletar/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao excluir produto');
      }

      exibirMensagem(`Produto "${produto.nome}" removido com sucesso.`, 'success');
      await carregarProdutos();
      await carregarEstatisticas();
    } catch (err) {
      console.error('Erro ao excluir produto:', err);
      exibirMensagem(err.message || 'Erro ao excluir produto.', 'error');
    }
  });
}

function registrarProduto(formulario, mensagemAlvo) {
  if (!formulario) return;

  formulario.addEventListener('submit', async (e) => {
    e.preventDefault();

    const campos = {
      nome: formulario.querySelector('[name="nome"]'),
      quantidade: formulario.querySelector('[name="quantidade"]'),
      valor: formulario.querySelector('[name="valor"]'),
      categoria: formulario.querySelector('[name="categoria"]'),
      unidade_medida: formulario.querySelector('[name="unidade_medida"]')
    };

    const novoProduto = {
      nome: (campos.nome?.value || '').trim(),
      quantidade: Number(campos.quantidade?.value),
      valor: Number(campos.valor?.value),
      categoria: (campos.categoria?.value || '').trim(),
      unidade_medida: campos.unidade_medida?.value
    };

    if (!novoProduto.nome || !novoProduto.categoria || !novoProduto.unidade_medida) {
      exibirMensagem('Preencha todos os campos obrigatórios.', 'error', mensagemAlvo);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/cadastrar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoProduto)
      });

      const data = await res.json();

      if (res.ok) {
        exibirMensagem('✦ Produto cadastrado com sucesso!', 'success', mensagemAlvo);
        formulario.reset();
        await carregarProdutos();
        await carregarEstatisticas();
      } else {
        exibirMensagem(data.error || 'Erro ao cadastrar produto.', 'error', mensagemAlvo);
      }
    } catch (err) {
      console.error('Erro na requisição:', err);
      exibirMensagem('Erro ao conectar com o servidor.', 'error', mensagemAlvo);
    }
  });
}

if (form) registrarProduto(form, messageDiv);
if (formAlt) registrarProduto(formAlt, messageDivAlt);

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  carregarProdutos();
  carregarEstatisticas();
});