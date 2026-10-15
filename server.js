require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const produtosRouter = require('./routes/produtos');

const app = express();

app.use(cors());
app.use(express.json());

// Arquivos estáticos (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Rotas da API
app.use('/api', produtosRouter);

// Página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Porta dinâmica para o Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});