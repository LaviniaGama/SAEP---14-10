const assert = require('node:assert/strict');
const test = require('node:test');

const router = require('../routes/produtos');

test('deve expor a função de data atual', () => {
  assert.strictEqual(typeof router.obterDataAtual, 'function');
});

test('a data atual deve estar em formato YYYY-MM-DD', () => {
  const data = router.obterDataAtual();
  assert.match(data, /^\d{4}-\d{2}-\d{2}$/);
});
