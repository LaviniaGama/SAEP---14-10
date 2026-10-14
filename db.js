const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

const connection = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || process.env.DB_DATABASE,
  port: Number(process.env.DB_PORT || 3306),
});

connection.getConnection((err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err);
    return;
  }

  console.log('Conexão com o banco de dados estabelecida com sucesso!');
});

module.exports = connection;