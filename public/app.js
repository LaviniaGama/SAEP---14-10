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

// Renderizar tabela na tela
function renderizarTabela(lista) {
  tbody.innerHTML = '';

  if (!Array.isArray(lista) || lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-muted, #a091c4); padding: 20px;">
          Nenhum produto encontrado.
        </td>
      </tr>`;
    if (sumCount) sumCount.textContent = '0';
    if (sumValue) sumValue.textContent = 'R$ 0,00';
    return;
  }

  let totalItens = 0;
  let valorTotal = 0;

  lista.forEach((prod) => {
    const qtd = Number(prod.quantidade) || 0;
    const val = Number(prod.valor) || 0;

    totalItens += qtd;
    valorTotal += qtd * val;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>#${prod.id}</td>
      <td><strong>${prod.nome}</strong></td>
      <td>${qtd}</td>
      <td>${formatarMoeda(val)}</td>
      <td>${prod.categoria}</td>
      <td>${prod.unidade_medida}</td>
      <td>
        <span style="color: var(--gold-soft, #f0d79a); font-size: 0.85rem;">Ativo</span>
      </td>
    `;
    tbody.appendChild(tr);
  });

  if (sumCount) sumCount.textContent = totalItens;
  if (sumValue) sumValue.textContent = formatarMoeda(valorTotal);
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