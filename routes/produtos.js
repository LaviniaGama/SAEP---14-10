const express = require('express');
const router = express.Router();
const db = require('../db');

function obterDataAtual() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const dia = String(hoje.getDate()).padStart(2, '0');

  return `${ano}-${mes}-${dia}`;
}

// Listar produtos
router.get('/listar', (req, res) => {
  const querySQL = `
    SELECT p.*, COALESCE(m.datas, p.data_cadastro) AS ultima_movimentacao
    FROM produtos p
    LEFT JOIN (
      SELECT DISTINCT ON (produtos_id) produtos_id, datas
      FROM movimentacoes
      ORDER BY produtos_id, datas DESC
    ) m ON m.produtos_id = p.id
    ORDER BY p.id ASC;
  `;

  db.query(querySQL, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
    res.json(results.rows);
  });
});

// Cadastrar novos produtos
router.post('/cadastrar', (req, res) => {
  const { nome, quantidade, valor, categoria, unidade_medida } = req.body;
  const dataAtual = obterDataAtual();

  if (!nome || quantidade == null || valor == null || !categoria || !unidade_medida) {
    return res.status(400).json({
      error: 'Payload inválido. Campos obrigatórios: nome, quantidade, valor, categoria',
    });
  }

  db.query(
    'INSERT INTO produtos (nome, valor, quantidade, categoria, unidade_medida, data_cadastro) VALUES (?, ?, ?, ?, ?, ?) RETURNING id',
    [nome, valor, quantidade, categoria, unidade_medida, dataAtual],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao cadastrar produto' });
      }

      const idProduto = results.rows?.[0]?.id ?? results.insertId;

      db.query(
        'INSERT INTO movimentacoes (datas, tipo, quantidade, produtos_id) VALUES (?, ?, ?, ?)',
        [dataAtual, 'entrada', quantidade, idProduto],
        (errMov, ) => {
          if (errMov) {
            return res.status(500).json({ error: 'Produto cadastrado, mas não foi possível registrar a data do cadastro.' });
          }

          return res.status(201).json({
            message: 'Produto cadastrado com sucesso',
            id: idProduto,
          });
        }
      );
    }
  );
});

// Excluir produto
router.delete('/deletar/:id', (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'ID do produto é obrigatório.' });
  }

  db.query('DELETE FROM movimentacoes WHERE produtos_id = ?', [id], (err) => {
    if (err) {
      console.error('Erro ao remover movimentações do produto:', err);
      return res.status(500).json({ error: 'Erro ao excluir movimentações do produto' });
    }

    db.query('DELETE FROM produtos WHERE id = ?', [id], (errDelete, results) => {
      if (errDelete) {
        return res.status(500).json({ error: 'Erro ao deletar produto' });
      }

      if ((results?.rowCount ?? 0) === 0) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }

      return res.status(200).json({ message: 'Produto removido com sucesso' });
    });
  });
});

function registrarMovimentacao({ id, quantidade, tipo, res }) {
  if (!id || quantidade == null || quantidade <= 0) {
    return res.status(400).json({ error: 'Informe um ID e uma quantidade maior que zero.' });
  }

  const dataAtual = obterDataAtual();

  db.query('SELECT quantidade FROM produtos WHERE id = ?', [id], (err, produtoResult) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao localizar produto.' });
    }

    const produtoAtual = produtoResult?.rows?.[0] || produtoResult?.[0];

    if (!produtoAtual) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const estoqueAtual = Number(produtoAtual.quantidade ?? produtoAtual[0]?.quantidade ?? 0);
    const novaQuantidade = tipo === 'saida' ? estoqueAtual - Number(quantidade) : estoqueAtual + Number(quantidade);

    if (tipo === 'saida' && novaQuantidade < 0) {
      return res.status(400).json({ error: 'Quantidade de saída maior que o estoque atual.' });
    }

    db.query(
      'UPDATE produtos SET quantidade = ? WHERE id = ?',
      [novaQuantidade, id],
      (errUpdate) => {
        if (errUpdate) {
          return res.status(500).json({ error: `Erro ao registrar ${tipo} do produto` });
        }

        db.query(
          'INSERT INTO movimentacoes (datas, tipo, quantidade, produtos_id) VALUES (?, ?, ?, ?)',
          [dataAtual, tipo, quantidade, id],
          (errInsert) => {
            if (errInsert) {
              return res.status(500).json({ error: 'Erro ao registrar movimentação.' });
            }

            return res.status(200).json({
              message: tipo === 'entrada' ? 'Entrada de produto registrada com sucesso' : 'Saída de produto registrada com sucesso',
            });
          }
        );
      }
    );
  });
}

// Registrar entrada no estoque
router.post('/entrada', (req, res) => {
  const { id, quantidade } = req.body;
  registrarMovimentacao({ id, quantidade, tipo: 'entrada', res });
});

// Registrar saída no estoque
router.post('/saida', (req, res) => {
  const { id, quantidade } = req.body;
  registrarMovimentacao({ id, quantidade, tipo: 'saida', res });
});

// Listar valor total por categoria
router.get('/valor-total', (req, res) => {
  db.query(
    'SELECT categoria, SUM(quantidade * valor) as valor_total FROM produtos GROUP BY categoria',
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar valor total por categoria' });
      }
      res.json(results.rows);
    }
  );
});

// Listar todas as entradas
router.get('/entradas', (req, res) => {
  db.query("SELECT * FROM movimentacoes WHERE tipo = 'entrada' ORDER BY datas DESC, id DESC", (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erro ao buscar entradas de produtos' });
    }
    res.json(results.rows);
  });
});

// Listar todas as saídas
router.get('/saidas', (req, res) => {
  db.query("SELECT * FROM movimentacoes WHERE tipo = 'saida' ORDER BY datas DESC, id DESC", (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erro ao buscar saídas de produtos' });
    }
    res.json(results.rows);
  });
});

// Histórico completo de movimentações
router.get('/historico', (req, res) => {
  const querySQL = `
    SELECT
      m.id,
      m.datas,
      m.tipo,
      m.quantidade,
      p.nome AS nome_do_produto,
      p.categoria
    FROM movimentacoes m
    INNER JOIN produtos p ON p.id = m.produtos_id
    ORDER BY m.datas DESC, m.id DESC;
  `;

  db.query(querySQL, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erro ao buscar histórico de movimentações' });
    }
    res.json(results.rows);
  });
});

// Identificar produtos nos limites
router.get('/limites', (req, res) => {
  db.query(
    'SELECT id, nome, quantidade, valor, categoria, quantidade AS percentual FROM produtos WHERE quantidade <= 0 OR quantidade >= 100',
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao buscar produtos com limites atingidos' });
      }
      res.json(results.rows);
    }
  );
});

// Listar movimentações por período
router.get('/movimentacoes', (req, res) => {
  const { data_inicial, data_final } = req.query;

  if (!data_inicial || !data_final) {
    return res.status(400).json({ error: 'Por favor, informe a data_inicial e data_final na URL.' });
  }

  const querySQL = `
    SELECT
      p.nome AS nome_do_produto,
      p.unidade_medida,
      SUM(CASE WHEN m.tipo = 'entrada' THEN m.quantidade ELSE 0 END) AS total_de_entradas,
      SUM(CASE WHEN m.tipo = 'saida' THEN m.quantidade ELSE 0 END) AS total_de_saidas,
      SUM(CASE WHEN m.tipo = 'saida' THEN m.quantidade ELSE 0 END) AS saida_no_periodo,
      SUM(CASE WHEN m.tipo = 'entrada' THEN m.quantidade * p.valor ELSE 0 END) AS valor_total_financeiro_das_entradas,
      SUM(CASE WHEN m.tipo = 'saida' THEN m.quantidade * p.valor ELSE 0 END) AS valor_financeiro_das_saidas
    FROM produtos p
    INNER JOIN movimentacoes m ON p.id = m.produtos_id
    WHERE m.datas BETWEEN ? AND ?
    GROUP BY p.id, p.nome, p.unidade_medida;
  `;

  db.query(querySQL, [data_inicial, data_final], (err, results) => {
    if (err) {
      console.error('Erro no SQL:', err);
      return res.status(500).json({ error: 'Erro ao buscar movimentações no período' });
    }
    res.json(results.rows);
  });
});

// Listar produtos com maior volume de saída
router.get('/maiores-saidas', (req, res) => {
  const { data_inicial, data_final } = req.query;

  let querySQL = `
    SELECT
      p.nome AS nome_do_produto,
      SUM(m.quantidade) AS quantidade_total_de_saidas,
      SUM(m.quantidade * p.valor) AS valor_total_financeiro_das_saidas
    FROM produtos p
    INNER JOIN movimentacoes m ON p.id = m.produtos_id
    WHERE m.tipo = 'saida'`;

  const params = [];

  if (data_inicial && data_final) {
    querySQL += ` AND m.datas BETWEEN ? AND ?`;
    params.push(data_inicial, data_final);
  }

  querySQL += `
    GROUP BY p.id, p.nome
    ORDER BY quantidade_total_de_saidas DESC;`;

  db.query(querySQL, params, (err, results) => {
    if (err) {
      console.error('ERRO NO BANCO (ROTA MAIORES SAÍDAS) ->', err);
      return res.status(500).json({ error: 'Erro ao buscar produtos com maiores saídas' });
    }
    res.json(results.rows);
  });
});

// Listar produtos com maior volume de entrada
router.get('/maiores-entradas', (req, res) => {
  const { data_inicial, data_final } = req.query;

  let querySQL = `
    SELECT
      p.nome AS nome_do_produto,
      SUM(m.quantidade) AS quantidade_total_de_entradas,
      SUM(m.quantidade * p.valor) AS valor_total_financeiro_das_entradas
    FROM produtos p
    INNER JOIN movimentacoes m ON p.id = m.produtos_id
    WHERE m.tipo = 'entrada'`;

  const params = [];

  if (data_inicial && data_final) {
    querySQL += ` AND m.datas BETWEEN ? AND ?`;
    params.push(data_inicial, data_final);
  }

  querySQL += `
    GROUP BY p.id, p.nome
    ORDER BY quantidade_total_de_entradas DESC;`;

  db.query(querySQL, params, (err, results) => {
    if (err) {
      console.error('ERRO NO BANCO (ROTA MAIORES ENTRADAS) ->', err);
      return res.status(500).json({ error: 'Erro ao buscar produtos com maiores entradas' });
    }
    res.json(results.rows);
  });
});

module.exports = router;
module.exports.obterDataAtual = obterDataAtual;