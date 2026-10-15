const express = require('express');
const router = express.Router();
const db = require('../db');

// Listar produtos
router.get('/listar', (req, res) => {
  db.query('SELECT * FROM produtos', (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Erro ao buscar produtos' });
    }
    res.json(results.rows);
  });
});

// Cadastrar novos produtos
router.post('/cadastrar', (req, res) => {
  const { nome, quantidade, valor, categoria, unidade_medida } = req.body;

  if (!nome || quantidade == null || valor == null || !categoria || !unidade_medida) {
    return res.status(400).json({
      error: 'Payload inválido. Campos obrigatórios: nome, quantidade, valor, categoria',
    });
  }

  db.query(
    'INSERT INTO produtos (nome, valor, quantidade, categoria, unidade_medida) VALUES (?, ?, ?, ?, ?) RETURNING id',
    [nome, valor, quantidade, categoria, unidade_medida],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao cadastrar produto' });
      }

      return res.status(201).json({
        message: 'Produto cadastrado com sucesso',
        id: results.rows?.[0]?.id ?? results.insertId,
      });
    }
  );
});

// Registrar entrada no estoque
router.post('/entrada', (req, res) => {
  const { id, quantidade } = req.body;

  if (!id || quantidade == null) {
    return res.status(400).json({ error: 'Campos "id" e "quantidade" são obrigatórios.' });
  }

  db.query(
    'UPDATE produtos SET quantidade = quantidade + ? WHERE id = ?',
    [quantidade, id],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: 'Erro ao registrar entrada de produto' });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ error: 'Produto não encontrado' });
      }

      return res.status(200).json({ message: 'Entrada de produto registrada com sucesso' });
    }
  );
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

// Listar todas as saídas
router.get('/saidas', (req, res) => {
  db.query("SELECT * FROM movimentacoes WHERE tipo = 'saida' ORDER BY datas DESC", (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Erro ao buscar saídas de produtos' });
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

  if (!data_inicial || !data_final) {
    return res.status(400).json({ error: 'Por favor, informe data_inicial e data_final na URL.' });
  }

  const querySQL = `
    SELECT
      p.nome AS nome_do_produto,
      SUM(m.quantidade) AS quantidade_total_de_saidas,
      SUM(m.quantidade * p.valor) AS valor_total_financeiro_das_saidas
    FROM produtos p
    INNER JOIN movimentacoes m ON p.id = m.produtos_id
    WHERE m.tipo = 'saida' AND m.datas BETWEEN ? AND ?
    GROUP BY p.id, p.nome
    ORDER BY quantidade_total_de_saidas DESC;
  `;

  db.query(querySQL, [data_inicial, data_final], (err, results) => {
    if (err) {
      console.error('ERRO NO BANCO (ROTA MAIORES SAÍDAS) ->', err);
      return res.status(500).json({ error: 'Erro ao buscar produtos com maiores saídas' });
    }
    res.json(results.rows);
  });
});

module.exports = router;