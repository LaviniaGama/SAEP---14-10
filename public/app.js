const API_URL = '/api';

// Elementos do DOM
const form = document.getElementById('product-form');
const tbody = document.getElementById('products-body');
const sumCount = document.getElementById('sum-count');
const sumValue = document.getElementById('sum-value');
const searchInput = document.getElementById('search-input');
const reloadBtn = document.getElementById('reload-btn');
const messageDiv = document.getElementById('form-message');

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

// Renderizar tabela na tela
function renderizarTabela(lista) {
  tbody.innerHTML = '';

  if (!Array.isArray(lista) || lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: var(--text-muted, #a091c4); padding: 20px;">
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
    } else {
      exibirMensagem(data.error || 'Erro ao cadastrar produto.', 'error');
    }
  } catch (err) {
    console.error('Erro na requisição:', err);
    exibirMensagem('Erro ao conectar com o servidor.', 'error');
  }
});

// Inicialização
document.addEventListener('DOMContentLoaded', carregarProdutos);