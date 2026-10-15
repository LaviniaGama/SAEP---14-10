const express = require('express');
const cors = require('cors');
const path = require('path');
const produtosRouter = require('./routes/produtos');

const app = express();

app.use(cors());
app.use(express.json());

// 1. Servir os ficheiros estáticos (HTML, CSS, JS) da pasta public
app.use(express.static(path.join(__dirname, 'public')));

// 2. Rotas da API (obrigatoriamente sob /api para não conflitar com a página principal)
app.use('/api', produtosRouter);

// 3. Rota principal: Entrega o index.html quando acede à raiz do site
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Porta dinâmica para o Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor a rodar na porta ${PORT}`);
});