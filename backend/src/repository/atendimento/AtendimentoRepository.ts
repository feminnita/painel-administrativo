import { and, desc, eq, isNull, isNotNull, sql } from 'drizzle-orm';
import { db } from '../../config/db';
import { atendimentoCasos } from '../../config/db/schema';

// A tabela e so do painel e o `drizzle-kit push` da loja (mesmo banco) derruba
// tabelas que nao conhece. Entao ela se cria sozinha: na primeira chamada do
// processo e de novo se sumir no meio do caminho (erro 42P01 = tabela inexistente).
// O mesmo DDL esta em scripts/cria_tabelas_do_painel.mjs.
const DDL = `
    CREATE TABLE IF NOT EXISTS "atendimento_casos" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "telefone" text NOT NULL,
        "nome" text,
        "resumo" text NOT NULL,
        "ultima_mensagem" text,
        "origem" text DEFAULT 'whatsapp-oficial' NOT NULL,
        "criado_em" timestamp with time zone DEFAULT now() NOT NULL,
        "atendido_em" timestamp with time zone,
        "atendido_por" text
    )`;
let tabelaPronta = false;

async function garantirTabela() {
    if (tabelaPronta) return;
    await db.execute(sql.raw(DDL));
    tabelaPronta = true;
}

function tabelaSumiu(e: unknown) {
    const err = e as { code?: string; cause?: { code?: string } };
    return err?.code === '42P01' || err?.cause?.code === '42P01';
}

async function comTabela<T>(fn: () => Promise<T>): Promise<T> {
    await garantirTabela();
    try {
        return await fn();
    } catch (e) {
        if (!tabelaSumiu(e)) throw e;
        tabelaPronta = false;
        await garantirTabela();
        return fn();
    }
}

// Um caso aberto por telefone: se a Lia passar a mesma cliente de novo antes do
// "Atendido", so atualiza o resumo (nao duplica na fila).
export function abrirOuAtualizar(c: { telefone: string; nome?: string; resumo: string; ultimaMensagem?: string; origem?: string }) {
    return comTabela(async () => {
        const [aberto] = await db.select().from(atendimentoCasos)
            .where(and(eq(atendimentoCasos.telefone, c.telefone), isNull(atendimentoCasos.atendidoEm))).limit(1);
        if (aberto) {
            await db.update(atendimentoCasos).set({ resumo: c.resumo, ultimaMensagem: c.ultimaMensagem }).where(eq(atendimentoCasos.id, aberto.id));
            return { id: aberto.id, repetido: true };
        }
        const [novo] = await db.insert(atendimentoCasos).values({
            telefone: c.telefone, nome: c.nome, resumo: c.resumo, ultimaMensagem: c.ultimaMensagem, origem: c.origem ?? 'whatsapp-oficial',
        }).returning({ id: atendimentoCasos.id });
        return { id: novo.id, repetido: false };
    });
}

export const listarAbertos = () => comTabela(() =>
    db.select().from(atendimentoCasos).where(isNull(atendimentoCasos.atendidoEm)).orderBy(atendimentoCasos.criadoEm));

export const listarAtendidosRecentes = () => comTabela(() =>
    db.select().from(atendimentoCasos).where(isNotNull(atendimentoCasos.atendidoEm)).orderBy(desc(atendimentoCasos.atendidoEm)).limit(20));

// Ultimos pedidos de quem escreve no WhatsApp, reconhecida pelo TELEFONE do
// cadastro (DDD + ultimos 8 digitos). A Lia so ve pedido da propria cliente:
// quem souber o numero do pedido de outra pessoa nao consegue o rastreio dela.
// DDD + 8 finais e nao o numero inteiro porque o WhatsApp manda 55 na frente e
// as vezes sem o 9 do celular, e o cadastro guarda com 10 ou 11 digitos.
export async function pedidosPorTelefone(telefone: string) {
    const d = telefone.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
    if (d.length < 10) return [];
    const ddd = d.slice(0, 2);
    const fim = d.slice(-8);
    const r = await db.execute(sql`
        with c as (
            select id, regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') as tel from customers
        )
        select o.order_number, o.status, o.payment_status, o.payment_method, o.tracking_url,
               o.created_at, o.shipped_at
          from orders o
          join c on c.id = o.customer_id
         where length(c.tel) >= 10
           and right(c.tel, 8) = ${fim}
           and (case when length(c.tel) >= 12 then substr(c.tel, 3, 2) else left(c.tel, 2) end) = ${ddd}
         order by (o.status = 'cancelled'), o.created_at desc
         limit 3`);
    return (r.rows as Record<string, unknown>[]).map((o) => ({
        pedido: o.order_number,
        situacao: o.status,
        pagamento: o.payment_status,
        forma: o.payment_method,
        rastreio: o.tracking_url ?? null,
        feitoEm: o.created_at,
        enviadoEm: o.shipped_at ?? null,
    }));
}

// Painel "Cliente" da tela Conversas: quem e a pessoa do WhatsApp no cadastro
// da loja e os ultimos pedidos dela. So leitura.
// O WhatsApp manda 55 + DDD + numero, as vezes sem o 9 do celular; o cadastro
// guarda do jeito que a cliente digitou (com ou sem 55, com 0 na frente, com
// mascara). Os dois lados viram "numero local" (10 ou 11 digitos) e casam por
// DDD + 8 ultimos digitos, que e o que sobra igual com ou sem o 9.
// Se mais de um cadastro casar, fica o que tem pedido mais recente.
export async function clientePorTelefone(telefone: string) {
    const d = telefone.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
    if (d.length < 10 || d.length > 11) return null;
    const ddd = d.slice(0, 2);
    const fim = d.slice(-8);
    const r = await db.execute(sql`
        with c as (
            select id, name, email, phone, created_at,
                   regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') as tel
              from customers
        ), n as (
            select *,
                   case when length(tel) in (12, 13) and left(tel, 2) = '55' then substr(tel, 3)
                        when length(tel) in (11, 12) and left(tel, 1) = '0' then substr(tel, 2)
                        else tel end as local
              from c
        )
        select n.id, n.name, n.email, n.phone,
               (select max(o.created_at) from orders o where o.customer_id = n.id) as ultimo_pedido_em
          from n
         where length(n.local) in (10, 11)
           and left(n.local, 2) = ${ddd}
           and right(n.local, 8) = ${fim}
         order by ultimo_pedido_em desc nulls last, n.created_at desc
         limit 1`);
    const cli = (r.rows as Record<string, unknown>[])[0];
    if (!cli) return null;

    const [end, peds] = await Promise.all([
        db.execute(sql`
            select city, state from addresses
             where customer_id = ${cli.id}
             order by is_default desc nulls last, updated_at desc nulls last
             limit 1`),
        db.execute(sql`
            select id, order_number, created_at, total, status, payment_status,
                   tracking_code, tracking_url, shipped_at
              from orders
             where customer_id = ${cli.id}
             order by created_at desc
             limit 5`),
    ]);
    const e = (end.rows as Record<string, unknown>[])[0];
    return {
        id: cli.id as string,
        nome: cli.name as string,
        email: cli.email as string,
        telefone: (cli.phone as string | null) ?? null,
        cidade: (e?.city as string | undefined) ?? null,
        uf: (e?.state as string | undefined) ?? null,
        pedidos: (peds.rows as Record<string, unknown>[]).map((o) => ({
            id: o.id as string,
            numero: o.order_number as string,
            criadoEm: o.created_at as string,
            total: Number(o.total),
            situacao: o.status as string,
            pagamento: o.payment_status as string,
            rastreio: (o.tracking_code as string | null) ?? null,
            rastreioUrl: (o.tracking_url as string | null) ?? null,
            enviadoEm: (o.shipped_at as string | null) ?? null,
        })),
    };
}

// "Devolver para a Lia" pela tela Conversas: fecha o caso aberto desse telefone
// (se houver), do mesmo jeito que o botao "Atendido" da tela Atendimento.
export function marcarAtendidoPorTelefone(telefone: string, quem: string) {
    return comTabela(async () => {
        const r = await db.update(atendimentoCasos).set({ atendidoEm: new Date(), atendidoPor: quem })
            .where(and(eq(atendimentoCasos.telefone, telefone), isNull(atendimentoCasos.atendidoEm)))
            .returning({ id: atendimentoCasos.id });
        return r.length;
    });
}

export function marcarAtendido(id: string, quem: string) {
    return comTabela(async () => {
        const r = await db.update(atendimentoCasos).set({ atendidoEm: new Date(), atendidoPor: quem })
            .where(and(eq(atendimentoCasos.id, id), isNull(atendimentoCasos.atendidoEm)))
            .returning({ id: atendimentoCasos.id, telefone: atendimentoCasos.telefone });
        return r[0] ?? null;
    });
}
