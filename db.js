const mysql = require('mysql2');

const host = process.env.MYSQLHOST || process.env.DB_HOST;
const user = process.env.MYSQLUSER || process.env.DB_USER;
const password = process.env.MYSQLPASSWORD || process.env.DB_PASSWORD;
const database = process.env.MYSQLDATABASE || process.env.DB_NAME;
const port = Number(process.env.MYSQLPORT || process.env.DB_PORT || 3306);

if (!host || !user || !database) {
    console.error(
        'Configuração do MySQL incompleta. Confira as variáveis de ambiente no Railway.'
    );
}

const db = mysql.createPool({
    host: host,
    user: user,
    password: password,
    database: database,
    port: port,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000
});

db.getConnection((err, connection) => {
    if (err) {
        console.error('Erro ao conectar ao MySQL:', err.message);
        return;
    }

    console.log('Conexão com MySQL estabelecida!');
    connection.release();
});

module.exports = db;