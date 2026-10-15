const assert = require('node:assert/strict');
const test = require('node:test');

const router = require('../routes/produtos');

function dataBrasiliaAtual() {
  const formatador = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const [ano, mes, dia] = formatador.format(new Date()).split('-');
  return `${ano}-${mes}-${dia}`;
}

test('deve expor a função de data atual', () => {
  assert.strictEqual(typeof router.obterDataAtual, 'function');
});

test('a data atual deve estar no fuso de São Paulo', () => {
  const data = router.obterDataAtual();
  assert.match(data, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(data, dataBrasiliaAtual());
});
