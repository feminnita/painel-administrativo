/**
 * Encerra execucoes de sincronizacao que ficaram marcadas como "running".
 *
 * Quando o processo do Render morre no meio de um sync (deploy, reinicio,
 * token vencido), a linha fica com status 'running' para sempre e a tela do
 * painel mostra "Rodando / pausado" indefinidamente. A trava de verdade e uma
 * variavel na memoria do servidor, que zera no reinicio — entao a linha presa
 * nao impede nada. So faz a tela mentir.
 *
 * Isso marca como 'interrupted' e carimba o fim, para a tela dizer a verdade.
 * Nao mexe em produto, preco nem estoque.
 *
 * Uso:
 *   node scripts/encerra_sync_travada.mjs             (ensaio)
 *   node scripts/encerra_sync_travada.mjs --aplicar
 */
import 'dotenv/config';
import pg from 'pg';

const APLICAR = process.argv.includes('--aplicar');

// Uma execucao de verdade nao passa de algumas horas. Acima disso, o processo
// morreu — nenhum sync legitimo fica vivo por um dia.
const HORAS_PARA_CONSIDERAR_MORTA = 6;

const cliente = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

try {
    await cliente.connect();

    const { rows: presas } = await cliente.query(
        `select id, started_at, products_synced, products_created, products_updated, errors
         from bling_sync_log
         where status = 'running'
           and started_at < now() - interval '${HORAS_PARA_CONSIDERAR_MORTA} hours'
         order by started_at`,
    );

    if (!presas.length) {
        console.log('Nenhuma execucao presa. Nada a fazer.');
        process.exit(0);
    }

    console.log(`${presas.length} execucao(oes) marcada(s) como "running" ha mais de ${HORAS_PARA_CONSIDERAR_MORTA}h:\n`);
    for (const p of presas) {
        const horas = Math.round((Date.now() - new Date(p.started_at)) / 3600000);
        console.log(`  ${new Date(p.started_at).toLocaleString('pt-BR')}  —  parada ha ${horas}h`);
        console.log(`     ${p.products_synced} sincronizados · ${p.products_created} criados · ${p.products_updated} atualizados · ${p.errors} erros`);
    }

    if (!APLICAR) {
        console.log('\n(ensaio: nada foi alterado — rode com --aplicar)');
        process.exit(0);
    }

    // finished_at = o ultimo momento em que ela deu sinal de vida, que e o
    // proprio started_at. Nao invento um horario de termino que nao houve.
    const { rowCount } = await cliente.query(
        `update bling_sync_log
            set status = 'interrupted',
                finished_at = coalesce(finished_at, started_at)
          where status = 'running'
            and started_at < now() - interval '${HORAS_PARA_CONSIDERAR_MORTA} hours'`,
    );
    console.log(`\n${rowCount} execucao(oes) marcada(s) como interrompida(s).`);

    const { rows: agora } = await cliente.query(
        `select status, count(*)::int n from bling_sync_log group by status order by n desc`,
    );
    console.log('situacao do historico agora:');
    for (const a of agora) console.log(`  ${a.status.padEnd(14)} ${a.n}`);
} catch (e) {
    console.error('ERRO:', e.message);
    process.exitCode = 1;
} finally {
    await cliente.end().catch(() => {});
}
