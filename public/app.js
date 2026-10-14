const API_URL = 'http://localhost:3000/api';

// Elementos do DOM
const form = document.getElementById('product-form');
const tbody = document.getElementById('products-body');
const sumCount = document.getElementById('sum-count');
const sumValue = document.getElementById('sum-value');

// 1. Função para procurar e exibir os produtos na tabela
async function carregarProdutos() {
  try {
    const res = await fetch(`${API_URL}/listar`);
    const produtos = await res.json();

    tbody.innerHTML = ''; // Limpa a tabela antes de preencher

    if (!Array.isArray(produtos) || produtos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Nenhum produto cadastrado.</td></tr>';
      if (sumCount) sumCount.textContent = '0';
      if (sumValue) sumValue.textContent = 'R$ 0,00';
      return;
    }

    let totalItens = 0;
    let valorTotal = 0;

    produtos.forEach((prod) => {
      totalItens += Number(prod.quantidade);
      valorTotal += Number(prod.quantidade) * Number(prod.valor);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${prod.id}</td>
        <td>${prod.nome}</td>
        <td>${prod.quantidade}</td>
        <td>R$ ${Number(prod.valor).toFixed(2)}</td>
        <td>${prod.categoria}</td>
        <td>${prod.unidade_medida}</td>
        <td>—</td>
      `;
      tbody.appendChild(tr);
    });

    // Atualiza os totais no rodapé da tabela
    if (sumCount) sumCount.textContent = totalItens;
    if (sumValue) sumValue.textContent = `R$ ${valorTotal.toFixed(2)}`;

  } catch (err) {
    console.error('Erro ao carregar produtos:', err);
  }
}

// 2. Evento de submissão do formulário
form.addEventListener('submit', async (e) => {
  e.preventDefault(); // Impede o recarregamento da página

  // Obter valores dos inputs
  const novoProduto = {
    nome: document.getElementById('nome').value,
    quantidade: Number(document.getElementById('quantidade').value),
    valor: Number(document.getElementById('valor').value),
    categoria: document.getElementById('categoria').value,
    unidade_medida: document.getElementById('unidade_medida').value
  };

  try {
    const res = await fetch(`${API_URL}/cadastrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoProduto)
    });

    const data = await res.json();

    if (res.ok) {
      alert('Produto cadastrado com sucesso!');
      form.reset(); 
      carregarProdutos(); 
    } else {
      alert(`Erro no cadastro: ${data.error}`);
    }
  } catch (err) {
    console.error('Erro ao conectar com a API:', err);
    alert('Erro ao conectar com o servidor.');
  }
});

// Carregar os produtos assim que a página abre
document.addEventListener('DOMContentLoaded', carregarProdutos);