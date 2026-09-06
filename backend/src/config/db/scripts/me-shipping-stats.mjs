/**
 * Valida as medidas reais de embalagem contra o histórico de envios do Melhor Envio.
 *
 * Roda no Render Shell (mesma env do backend do painel):
 *     npm run me:shipping-stats
 *
 * NÃO imprime o token — lê access_token de me_tokens, chama /me/orders paginado,
 * agrega as dimensões DECLARADAS por volume e imprime só estatística (clusters de
 * base largura×comprimento + espessura por grupo + densidade). Cola a SAÍDA aqui.
 *
 * Se der erro, ele diz QUAL (token expirado, shape inesperado, rate limit).
 */
import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

// base da API v2 do ME (mesma do env.melhorEnvio.baseUrl); produção por padrão
const ME_BASE = (process.env.ME_BASE_URL || 'https://www.melhorenvio.com.br/api/v2').replace(/\/$/, '');
const STORE_EMAIL = process.env.FEMINNITA_EMAIL || 'feminnita@gmail.com';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const round5 = (n) => Math.round(n / 5) * 5;
const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

function percentile(sorted, p) {
    if (!sorted.length) return null;
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
    return sorted[idx];
}

async function getAccessToken() {
    const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await c.connect();
    const r = await c.query(
        `SELECT access_token, expires_at FROM me_tokens ORDER BY updated_at DESC NULLS LAST LIMIT 1;`
    );
    await c.end();
    if (!r.rows.length || !r.rows[0].access_token) {
        throw new Error('me_tokens vazia ou sem access_token — reautorize o ME no painel.');
    }
    const { access_token, expires_at } = r.rows[0];
    if (expires_at && new Date(expires_at).getTime() < Date.now()) {
        console.warn(`[aviso] token com expires_at no passado (${new Date(expires_at).toISOString()}); se a API retornar 401, reautorize o ME.`);
    }
    return access_token;
}

async function fetchPage(token, page) {
    const res = await fetch(`${ME_BASE}/me/orders?page=${page}`, {
        headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
            'User-Agent': `Feminnita (${STORE_EMAIL})`,
        },
    });
    if (res.status === 401) throw new Error('401 do ME — token inválido/expirado. Reautorize o ME no painel.');
    if (res.status === 429) return { rateLimited: true };
    if (!res.ok) throw new Error(`ME ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return res.json();
}

// extrai triplas (w,l,h,weight,status) de um pedido, tentando os caminhos conhecidos do ME
function extractVolumes(order) {
    const out = [];
    const status = order.status || order.self_tracking || 'desconhecido';
    const push = (w, l, h, weight) => {
        const W = num(w), L = num(l), H = num(h);
        if (W && L && H) out.push({ w: W, l: L, h: H, weight: num(weight), status });
    };
    if (Array.isArray(order.volumes)) {
        for (const v of order.volumes) push(v.width, v.length, v.height, v.weight);
    }
    // fallback: dims no topo do pedido
    if (!out.length && (order.width || order.length || order.height)) {
        push(order.width, order.length, order.height, order.weight);
    }
    return out;
}

async function main() {
    console.log(`# Validação de embalagem vs histórico ME — base ${ME_BASE}`);
    const token = await getAccessToken();

    const all = [];
    const statusCount = {};
    let sampleKeys = null;
    let page = 1, guardPages = 200;

    while (page <= guardPages) {
        let json;
        try {
            json = await fetchPage(token, page);
        } catch (e) {
            console.error(`[erro] página ${page}: ${e.message}`);
            break;
        }
        if (json.rateLimited) { await sleep(3000); continue; }

        const data = Array.isArray(json.data) ? json.data : (Array.isArray(json) ? json : []);
        if (!data.length) break;
        if (!sampleKeys && data[0]) sampleKeys = Object.keys(data[0]);

        for (const order of data) {
            statusCount[order.status || '—'] = (statusCount[order.status || '—'] || 0) + 1;
            for (const v of extractVolumes(order)) all.push(v);
        }

        const lastPage = json.meta?.last_page ?? json.last_page ?? null;
        if (lastPage && page >= lastPage) break;
        page++;
        await sleep(250);
    }

    console.log(`\n## Pedidos: ${Object.values(statusCount).reduce((a, b) => a + b, 0)} | volumes com medida: ${all.length}`);
    console.log('## Status:', JSON.stringify(statusCount));
    if (sampleKeys) console.log('## Chaves de um pedido (diagnóstico):', JSON.stringify(sampleKeys));

    if (!all.length) {
        console.log('\n[!] Nenhuma dimensão declarada encontrada — o shape do pedido pode ser outro. Veja as chaves acima e me manda que ajusto o caminho.');
        process.exit(0);
    }

    // densidade global (g/L): weight(kg)->g / volume(cm3)->L
    const dens = [];
    for (const v of all) {
        if (v.weight && v.w && v.l && v.h) {
            const liters = (v.w * v.l * v.h) / 1000;
            if (liters > 0) dens.push((v.weight * 1000) / liters);
        }
    }
    dens.sort((a, b) => a - b);
    console.log('\n## Densidade declarada (g/L):',
        `n=${dens.length} p10=${percentile(dens, 0.10)?.toFixed(0)} mediana=${percentile(dens, 0.5)?.toFixed(0)} p90=${percentile(dens, 0.9)?.toFixed(0)}`);

    // clusters por base (dois maiores lados), espessura = menor lado
    const clusters = new Map();
    for (const v of all) {
        const d = [v.w, v.l, v.h].sort((a, b) => b - a); // d0>=d1>=d2
        const key = `${round5(d[0])}x${round5(d[1])}`;
        if (!clusters.has(key)) clusters.set(key, { count: 0, thick: [] });
        const c = clusters.get(key);
        c.count++;
        c.thick.push(d[2]);
    }
    const rows = [...clusters.entries()]
        .map(([base, c]) => {
            const t = c.thick.sort((a, b) => a - b);
            return { base, count: c.count, tMin: t[0], tMed: percentile(t, 0.5), tP90: percentile(t, 0.9), tMax: t[t.length - 1] };
        })
        .sort((a, b) => b.count - a.count);

    console.log('\n## Clusters de base (largura×comprimento, arred. 5cm) — mais repetidos primeiro');
    console.log('base(cm)      | envios | esp.min | esp.med | esp.p90 | esp.max');
    for (const r of rows.slice(0, 25)) {
        console.log(
            `${r.base.padEnd(13)} | ${String(r.count).padStart(6)} | ${String(r.tMin).padStart(7)} | ${String(r.tMed).padStart(7)} | ${String(r.tP90).padStart(7)} | ${String(r.tMax).padStart(7)}`
        );
    }
    console.log('\n(cole essa saída inteira aqui — calibro as bases das sacolas no packaging.config.ts com esses números reais)');
    process.exit(0);
}

main().catch((e) => { console.error('[falha]', e.message); process.exit(1); });
