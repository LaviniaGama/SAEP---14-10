require('dotenv').config();

const app = require('./app');
const port = process.env.PORT || 3000;

const express = require('express');
const cors = require('cors');
const produtosRouter = require('./routes/produtos');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

app.use('/api', produtosRouter);

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});