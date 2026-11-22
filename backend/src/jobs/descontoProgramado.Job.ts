import { sql } from 'drizzle-orm';
import { db } from '../config/db';

/**
 * Desconto programado: o preço especial entra e sai do ar sozinho.
 *
 * A Chris (22/11): "dentro do próprio produto, que já tem um preço riscado, ...
 * um preço diferente numa data específica". Ela divulga no grupo VIP toda semana
 * uma promoção ou um lançamento e quer que o site mude na hora marcada.
 *
 * O campo "Preço em promoção" (sale_price) já é o preço do dia a dia do site —
 * quase todo produto tem, com data final em 2027. Então o especial não pode
 * morar nele de forma permanente: no início o job GUARDA o sale_price em
 * promo_prog_preco_normal e põe o especial no lugar; no fim, devolve o guardado.
 * A loja não precisou mudar: ela continua lendo sale_price.
 *
 * Lançamento: o produto fica fora da loja (active = false, posto ao
 * salvar) e aparece no início, já com o preço especial. No fim só o preço volta;
 * o produto fica na loja.
 *
 * Roda de minuto em minuto. Cada passo é um UPDATE com a condição dentro, então
 * rodar duas vezes não faz nada a mais e um passo não pisa no outro.
 */
const INTERVALO_MS = 60 * 1000;
let rodando = false;

type Linha = { code: string | null; name: string };

function lista(rows: Linha[]): string {
    return rows.map((r) => r.code ?? r.name).join(', ');
}

export async function rodarDescontoProgramado(): Promise<void> {
    // 1. Entrou na janela e ainda não está no ar -> guarda o preço do dia a dia e põe o especial.
    const entrou = await db.execute<Linha>(sql`
        update products set
            promo_prog_preco_normal = sale_price,
            sale_price = promo_prog_preco,
            promo_prog_aplicada = true,
            active = case when promo_prog_lancamento then true else active end,
            updated_at = now()
        where promo_prog_aplicada = false
          and promo_prog_preco is not null
          and promo_prog_inicio <= now()
          and (promo_prog_fim is null or promo_prog_fim > now())
        returning code, name`);

    // 2. No ar, mas alguém mexeu no sale_price (tela antiga aberta, sincronização):
    //    o valor novo vira o preço do dia a dia guardado e o especial volta.
    const corrigido = await db.execute<Linha>(sql`
        update products set
            promo_prog_preco_normal = sale_price,
            sale_price = promo_prog_preco,
            updated_at = now()
        where promo_prog_aplicada = true
          and promo_prog_preco is not null
          and promo_prog_inicio <= now()
          and (promo_prog_fim is null or promo_prog_fim > now())
          and sale_price is distinct from promo_prog_preco
        returning code, name`);

    // 2b. Lançamento no ar que alguém desativou salvando uma tela aberta antes do
    //     início: volta a aparecer. (Para tirar um lançamento do ar, cancela o desconto.)
    await db.execute(sql`
        update products set active = true, updated_at = now()
        where promo_prog_aplicada = true and promo_prog_lancamento = true and active = false
          and promo_prog_inicio <= now()
          and (promo_prog_fim is null or promo_prog_fim > now())`);

    // 3. Fora da janela (acabou, foi cancelado ou a data mudou) e ainda no ar -> devolve o preço do dia a dia.
    const saiu = await db.execute<Linha>(sql`
        update products set
            sale_price = promo_prog_preco_normal,
            promo_prog_preco_normal = null,
            promo_prog_aplicada = false,
            updated_at = now()
        where promo_prog_aplicada = true
          and not (promo_prog_preco is not null
                   and promo_prog_inicio <= now()
                   and (promo_prog_fim is null or promo_prog_fim > now()))
        returning code, name`);

    if (entrou.rows.length) console.log(`[DESCONTO-PROG] entrou no ar: ${lista(entrou.rows)}`);
    if (corrigido.rows.length) console.log(`[DESCONTO-PROG] preço especial reposto: ${lista(corrigido.rows)}`);
    if (saiu.rows.length) console.log(`[DESCONTO-PROG] saiu do ar (preço do dia a dia de volta): ${lista(saiu.rows)}`);
}

export function startDescontoProgramado(): void {
    const ciclo = async () => {
        if (rodando) return;
        rodando = true;
        try {
            await rodarDescontoProgramado();
        } catch (erro) {
            console.error('[DESCONTO-PROG] falhou:', erro instanceof Error ? erro.message : erro);
        } finally {
            rodando = false;
        }
    };
    void ciclo();
    setInterval(ciclo, INTERVALO_MS);
}
