const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

require('./db');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const produtosRoutes = require('./routes/produtos');

app.use('/produtos', produtosRoutes);

// Rota inicial para testar se o servidor está funcionando
app.get('/', (req, res) => {
    res.status(200).send('API de Gestão de Produtos funcionando!');
});

module.exports = app;