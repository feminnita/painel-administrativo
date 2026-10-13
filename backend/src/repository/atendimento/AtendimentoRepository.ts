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

export function marcarAtendido(id: string, quem: string) {
    return comTabela(async () => {
        const r = await db.update(atendimentoCasos).set({ atendidoEm: new Date(), atendidoPor: quem })
            .where(and(eq(atendimentoCasos.id, id), isNull(atendimentoCasos.atendidoEm)))
            .returning({ id: atendimentoCasos.id, telefone: atendimentoCasos.telefone });
        return r[0] ?? null;
    });
}
