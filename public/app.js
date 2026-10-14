const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));
app.use('/produtos', require('./routes/produtos')); // ajuste o caminho da rota

const API_BASE = '/produtos';

const form = document.getElementById('product-form');
const formMessage = document.getElementById('form-message');
const tbody = document.getElementById('products-body');
const loading = document.getElementById('loading');
const emptyState = document.getElementById('empty-state');
const reloadBtn = document.getElementById('reload-btn');
const searchInput = document.getElementById('search-input');
const sumCount = document.getElementById('sum-count');
const sumValue = document.getElementById('sum-value');

let allProducts = [];

// ---------- Fetch: listar ----------
async function loadProducts() {
  loading.classList.remove('hidden');
  emptyState.classList.add('hidden');
  tbody.innerHTML = '';

  try {
    const res = await fetch(`${API_BASE}/listar`);
    if (!res.ok) throw new Error('Falha ao buscar produtos');

    const data = await res.json();
    allProducts = Array.isArray(data) ? data : [];
    applyFilter();
  } catch (err) {
    tbody.innerHTML = `
      <tr><td colspan="7" style="text-align:center; color:var(--danger); padding:24px;">
        ⚠ Erro ao carregar produtos
      </td></tr>`;
  } finally {
    loading.classList.add('hidden');
  }
}

// ---------- Render ----------
function applyFilter() {
  const term = (searchInput.value || '').trim().toLowerCase();

  const filtered = term
    ? allProducts.filter(p =>
        String(p.nome || '').toLowerCase().includes(term) ||
        String(p.categoria || '').toLowerCase().includes(term)
      )
    : allProducts;

  renderProducts(filtered);
  updateSummary(filtered);
}

function renderProducts(produtos) {
  if (!produtos.length) {
    tbody.innerHTML = '';
    emptyState.classList.remove('hidden');
    emptyState.textContent = allProducts.length
      ? 'Nenhum produto corresponde à busca.'
      : 'Nenhum produto cadastrado ainda.';
    return;
  }

  emptyState.classList.add('hidden');
  tbody.innerHTML = produtos.map(p => `
    <tr>
      <td>${p.id ?? '-'}</td>
      <td>${escapeHtml(p.nome)}</td>
      <td>${p.quantidade ?? 0}</td>
      <td>R$ ${formatCurrency(p.valor)}</td>
      <td>${escapeHtml(p.categoria)}</td>
      <td>${escapeHtml(p.unidade_medida)}</td>
      <td>
        <button class="btn-delete" data-id="${p.id}" title="Excluir">Excluir</button>
      </td>
    </tr>
  `).join('');
}

function updateSummary(produtos) {
  const count = produtos.reduce((acc, p) => acc + Number(p.quantidade || 0), 0);
  const total = produtos.reduce(
    (acc, p) => acc + Number(p.valor || 0) * Number(p.quantidade || 0),
    0
  );
  sumCount.textContent = count;
  sumValue.textContent = 'R$ ' + formatCurrency(total);
}

// ---------- Fetch: cadastrar ----------
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearInvalid();

  const payload = {
    nome: form.nome.value.trim(),
    quantidade: Number(form.quantidade.value),
    valor: Number(form.valor.value),
    categoria: form.categoria.value.trim(),
    unidade_medida: form.unidade_medida.value,
  };

  const missing = validate(payload);
  if (missing.length) {
    missing.forEach(name => form[name]?.classList.add('invalid'));
    showMessage('⚠ Preencha todos os campos corretamente.', 'error');
    return;
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/cadastrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar produto');

    showMessage('⚡ Produto cadastrado com sucesso!', 'success');
    form.reset();
    await loadProducts();
  } catch (err) {
    showMessage('⚠ ' + err.message, 'error');
  } finally {
    submitBtn.disabled = false;
  }
});

// ---------- Ações da tabela (delegado) ----------
tbody.addEventListener('click', async (e) => {
  const btn = e.target.closest('.btn-delete');
  if (!btn) return;

  const id = btn.dataset.id;
  if (!confirm(`Deseja realmente excluir o produto #${id}?`)) return;

  try {
    // Se você tiver a rota DELETE no backend, descomente abaixo:
    // const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    // if (!res.ok) throw new Error('Erro ao excluir produto');

    // Fallback local (somente UI), já que a rota não foi fornecida:
    allProducts = allProducts.filter(p => String(p.id) !== String(id));
    applyFilter();
    showMessage('Produto removido da listagem.', 'success');
  } catch (err) {
    showMessage('⚠ ' + err.message, 'error');
  }
});

// ---------- Busca e reload ----------
searchInput.addEventListener('input', applyFilter);
reloadBtn.addEventListener('click', loadProducts);

// ---------- Helpers ----------
function validate(p) {
  const missing = [];
  if (!p.nome) missing.push('nome');
  if (!Number.isFinite(p.quantidade) || p.quantidade < 0) missing.push('quantidade');
  if (!Number.isFinite(p.valor) || p.valor < 0) missing.push('valor');
  if (!p.categoria) missing.push('categoria');
  if (!p.unidade_medida) missing.push('unidade_medida');
  return missing;
}

function clearInvalid() {
  form.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
}

function showMessage(text, type) {
  formMessage.textContent = text;
  formMessage.className = 'message ' + type;
  clearTimeout(showMessage._t);
  showMessage._t = setTimeout(() => {
    formMessage.textContent = '';
    formMessage.className = 'message';
  }, 3500);
}

function formatCurrency(v) {
  const n = Number(v) || 0;
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ---------- Init ----------
loadProducts();