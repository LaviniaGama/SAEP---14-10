require('dotenv').config();

const mysql = require('mysql2');

const host = process.env.MYSQLHOST || process.env.DB_HOST;
const user = process.env.MYSQLUSER || process.env.DB_USER;
const password = process.env.MYSQLPASSWORD || process.env.DB_PASSWORD;
const database = process.env.MYSQLDATABASE || process.env.DB_NAME;
const port = Number(process.env.MYSQLPORT || process.env.DB_PORT || 3306);

console.log('Tentando conectar no MySQL:', { host, user, database, port });

if (!host || !user || !database) {
  console.error('Configuração do MySQL incompleta. Confira as variáveis de ambiente.');
}

const db = mysql.createPool({
  host,
  user,
  password,
  database,
  port,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10000
});

const criarProdutos = `
  CREATE TABLE IF NOT EXISTS produtos (
    id INT NOT NULL AUTO_INCREMENT,
    nome VARCHAR(255) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    quantidade INT NOT NULL,
    categoria VARCHAR(255) NOT NULL,
    unidade_medida VARCHAR(50) NOT NULL,
    PRIMARY KEY (id)
  ) ENGINE = InnoDB
`;

const criarMovimentacoes = `
  CREATE TABLE IF NOT EXISTS movimentacoes (
    id INT NOT NULL AUTO_INCREMENT,
    datas DATE NOT NULL,
    tipo VARCHAR(10) NOT NULL,
    quantidade INT NOT NULL,
    produtos_id INT NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_movimentacoes_produtos
      FOREIGN KEY (produtos_id) REFERENCES produtos (id)
  ) ENGINE = InnoDB
`;

const inserirProdutos = `
  INSERT INTO produtos (nome, quantidade, valor, categoria, unidade_medida) VALUES
  ('Bodysplash', 12, 20.00, 'Produto de beleza', 'Litro'),
  ('Moletom', 10, 50.00, 'Roupa', 'Unidade'),
  ('Batom', 20, 10.00, 'Produto de beleza', 'Unidade')
`;

const inserirMovimentacoes = `
  INSERT INTO movimentacoes (datas, tipo, quantidade, produtos_id) VALUES
  ('2026-05-10', 'entrada', 10, 1),
  ('2026-05-12', 'saida', 5, 1),
  ('2026-05-15', 'entrada', 20, 2),
  ('2026-05-20', 'saida', 10, 2),
  ('2026-05-22', 'saida', 4, 3)
`;

function iniciarBanco() {
  const p = db.promise();

  p.query(criarProdutos)
    .then(() => p.query(criarMovimentacoes))
    .then(() => p.query('SELECT COUNT(*) AS total FROM produtos'))
    .then(([rows]) => {
      if (rows[0].total === 0) {
        return p
          .query(inserirProdutos)
          .then(() => p.query(inserirMovimentacoes))
          .then(() => console.log('Dados iniciais inseridos.'));
      }
    })
    .then(() => console.log('Banco pronto: tabelas verificadas!'))
    .catch((err) => {
      console.error('Erro ao preparar o banco:', err.code, err.message);
    });
}

iniciarBanco();

module.exports = db;