const API_URL = '/api';

// Elementos do DOM
const form = document.getElementById('product-form');
const tbody = document.getElementById('products-body');
const sumCount = document.getElementById('sum-count');
const sumValue = document.getElementById('sum-value');
const searchInput = document.getElementById('search-input');
const reloadBtn = document.getElementById('reload-btn');
const messageDiv = document.getElementById('form-message');
const limitAlertsBody = document.getElementById('limit-alerts-body');
const topSaidasBody = document.getElementById('top-saidas-body');
const topEntradasBody = document.getElementById('top-entradas-body');
const historyBody = document.getElementById('history-body');

let todosProdutos = [];

// Exibir mensagens na div do formulário
function exibirMensagem(texto, tipo = 'success') {
  if (!messageDiv) return;
  messageDiv.textContent = texto;
  messageDiv.className = `message ${tipo}`;
  setTimeout(() => {
    messageDiv.textContent = '';
    messageDiv.className = 'message';
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

  if (sumCount) sumCount.textContent = totalItens;
  if (sumValue) sumValue.textContent = formatarMoeda(valorTotal);
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

function preencherHistorico(itens) {
  if (!historyBody) return;

  if (!Array.isArray(itens) || !itens.length) {
    historyBody.innerHTML = `
      <tr>
        <td colspan="5" class="alert-empty">Nenhuma movimentação registrada.</td>
      </tr>
    `;
    return;
  }

  historyBody.innerHTML = itens
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

// Renderizar tabela na tela
function renderizarTabela(lista) {
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
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--danger, #ff8b9a); padding: 20px;">
          Erro ao conectar com o banco de dados.
        </td>
      </tr>`;
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
  } catch (err) {
    console.error('Erro ao carregar estatísticas:', err);
    if (topSaidasBody) topSaidasBody.innerHTML = '<tr><td colspan="3" class="alert-empty">Erro ao carregar saídas.</td></tr>';
    if (topEntradasBody) topEntradasBody.innerHTML = '<tr><td colspan="3" class="alert-empty">Erro ao carregar entradas.</td></tr>';
    if (historyBody) historyBody.innerHTML = '<tr><td colspan="5" class="alert-empty">Erro ao carregar histórico.</td></tr>';
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

// 4. Submissão do formulário
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const novoProduto = {
    nome: document.getElementById('nome').value.trim(),
    quantidade: Number(document.getElementById('quantidade').value),
    valor: Number(document.getElementById('valor').value),
    categoria: document.getElementById('categoria').value.trim(),
    unidade_medida: document.getElementById('unidade_medida').value
  };

  if (!novoProduto.nome || !novoProduto.categoria || !novoProduto.unidade_medida) {
    exibirMensagem('Preencha todos os campos obrigatórios.', 'error');
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
      exibirMensagem('✦ Produto cadastrado com sucesso!', 'success');
      form.reset();
      await carregarProdutos();
      await carregarEstatisticas();
    } else {
      exibirMensagem(data.error || 'Erro ao cadastrar produto.', 'error');
    }
  } catch (err) {
    console.error('Erro na requisição:', err);
    exibirMensagem('Erro ao conectar com o servidor.', 'error');
  }
});

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  carregarProdutos();
  carregarEstatisticas();
});