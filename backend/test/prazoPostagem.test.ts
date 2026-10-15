// node --import tsx --test test/prazoPostagem.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prazosDaCompra, situacaoDaPostagem } from '../src/domain/shipping/prazoPostagem';

// Outubro/2026: 19 = segunda ... 23 = sexta, 24-25 = fim de semana.
const BRT = (dia: string, hora = '10:00') => new Date(`${dia}T${hora}:00-03:00`);

test('compra na segunda: bipar na terca, no maximo na quarta', () => {
    assert.deepEqual(prazosDaCompra(BRT('2026-10-19')), { inicio: '2026-10-19', esperado: '2026-10-20', limite: '2026-10-21' });
});

test('compra na sexta: fim de semana nao conta, vence na terca', () => {
    assert.equal(prazosDaCompra(BRT('2026-10-23')).limite, '2026-10-27');
});

test('compra no sabado ou domingo conta como chegada na segunda', () => {
    assert.equal(prazosDaCompra(BRT('2026-10-24')).inicio, '2026-10-26');
    assert.equal(prazosDaCompra(BRT('2026-10-25', '23:30')).limite, '2026-10-28');
});

test('compra de madrugada vale o dia de Brasilia, nao o UTC', () => {
    // 23h de sexta em Brasilia ja e sabado em UTC
    assert.equal(prazosDaCompra(BRT('2026-10-23', '23:00')).inicio, '2026-10-23');
});

test('feriado fixo nao conta (02/11 e segunda)', () => {
    assert.equal(prazosDaCompra(BRT('2026-10-30')).limite, '2026-11-04');
});

test('situacao: no prazo, vence hoje, atrasado, bipado', () => {
    const compra = BRT('2026-10-19');
    assert.equal(situacaoDaPostagem(compra, null, BRT('2026-10-20')).situacao, 'no_prazo');
    assert.equal(situacaoDaPostagem(compra, null, BRT('2026-10-21')).situacao, 'vence_hoje');
    const atraso = situacaoDaPostagem(compra, null, BRT('2026-10-26'));
    assert.equal(atraso.situacao, 'atrasado');
    assert.equal(atraso.diasDeAtraso, 3); // qui, sex, seg
    assert.equal(situacaoDaPostagem(compra, BRT('2026-10-20'), BRT('2026-10-26')).situacao, 'bipado');
    assert.equal(situacaoDaPostagem(compra, BRT('2026-10-22'), BRT('2026-10-26')).situacao, 'bipado_com_atraso');
});
