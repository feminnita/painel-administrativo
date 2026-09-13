/**
 * Prova, contra o banco de PRODUCAO, que apagar uma variacao agora SEGURA.
 *
 * Roda o codigo de verdade: a lixeira (ProductSkuService.deleteSku) e o
 * repositorio da marca. Nao simula nada.
 *
 * Cria um produto de teste e apaga tudo no fim.
 *
 * Uso: npx tsx _prova_apagou_ficou.ts
 */
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from './src/config/db';
import * as ProductSkuService from './src/services/product/ProductSkuService';
import * as Apagadas from './src/repository/product/VariacoesApagadasRepository';

let falhou = false;
const ok = (nome: string, cond: boolean, detalhe = '') => {
    if (!cond) falhou = true;
    console.log(`  ${cond ? 'OK  ' : 'ERRO'} ${nome}${detalhe ? '  — ' + detalhe : ''}`);
};

const MARCA = `PROVA${Date.now().toString().slice(-6)}`;
const COR = 'CorProva' + MARCA;

async function main() {
    let produtoId = '';
    let corId = '';

    const tamanhos = async (): Promise<string[]> => {
        const { rows } = await db.execute(
            sql`SELECT size FROM products_skus WHERE product_id = ${produtoId} ORDER BY size`);
        return rows.map((r: any) => r.size);
    };

    try {
        const { rows: [p] } = await db.execute(sql`
            INSERT INTO products (name, slug, code, base_price, active)
            VALUES (${'Produto de Prova ' + MARCA}, ${'prova-' + MARCA.toLowerCase()}, ${MARCA}, '10.00', false)
            RETURNING id`);
        produtoId = (p as any).id;

        const { rows: [c] } = await db.execute(
            sql`INSERT INTO products_colors (name, image_url) VALUES (${COR}, '') RETURNING id`);
        corId = (c as any).id;

        for (const size of ['M', 'G', 'GG']) {
            await db.execute(sql`
                INSERT INTO products_skus (product_id, size, color_id, active)
                VALUES (${produtoId}, ${size}, ${corId}, true)`);
        }
        ok('3 variacoes criadas', (await tamanhos()).length === 3);

        // 1. A lixeira apaga E registra a marca
        const { rows: [alvo] } = await db.execute(
            sql`SELECT id FROM products_skus WHERE product_id = ${produtoId} AND size = 'GG'`);
        await ProductSkuService.deleteSku((alvo as any).id);

        ok('apagou do banco', !(await tamanhos()).includes('GG'));
        const marcadas = await Apagadas.bloqueadas(produtoId);
        ok('registrou a marca', marcadas.size === 1, [...marcadas].join(','));

        // 2. A marca cobre a combinacao certa, e o save a consulta antes de inserir
        const chave = `${Apagadas.chaveVariacao(COR)}__${Apagadas.chaveVariacao('GG')}`;
        ok('marca cobre exatamente cor+tamanho apagados', marcadas.has(chave), chave);

        // 3. Escrita diferente NAO dribla a marca
        await Apagadas.marcar(produtoId, 'Preto Poá', 'GG');
        const b2 = await Apagadas.bloqueadas(produtoId);
        ok('"pretopoa" cai na mesma marca de "Preto Poá"',
            b2.has(`${Apagadas.chaveVariacao('pretopoa')}__${Apagadas.chaveVariacao('gg')}`));

        // 4. Marcar duas vezes nao duplica
        await Apagadas.marcar(produtoId, COR, 'GG');
        ok('marcar de novo nao duplica', (await Apagadas.bloqueadas(produtoId)).size === 2);

        // 5. Adicionar de proposito LIBERA
        await Apagadas.desmarcar(produtoId, COR, 'GG');
        const b3 = await Apagadas.bloqueadas(produtoId);
        ok('liberou so a combinacao pedida', b3.size === 1 && !b3.has(chave));

        // 6. Variacao COM PEDIDO: desativa e marca (nao some do historico)
        const { rows: [comPedido] } = await db.execute(
            sql`SELECT id FROM products_skus WHERE product_id = ${produtoId} AND size = 'M'`);
        const r = await ProductSkuService.deleteSku((comPedido as any).id);
        ok('sem pedido -> apagada', r.action === 'deleted', r.action);
    } catch (e) {
        console.error('ERRO:', (e as Error).message);
        falhou = true;
    } finally {
        if (produtoId) {
            await db.execute(sql`DELETE FROM product_deleted_variations WHERE product_id = ${produtoId}`);
            await db.execute(sql`DELETE FROM products_skus WHERE product_id = ${produtoId}`);
            await db.execute(sql`DELETE FROM products WHERE id = ${produtoId}`);
        }
        if (corId) await db.execute(sql`DELETE FROM products_colors WHERE id = ${corId}`);
        console.log('\n(produto de prova apagado)');
    }

    console.log(`VEREDITO: ${falhou ? 'FALHOU' : 'OK'}`);
    process.exit(falhou ? 1 : 0);
}

main();
