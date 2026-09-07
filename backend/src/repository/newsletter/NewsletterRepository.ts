import { and, desc, eq, ilike, isNotNull, isNull, or, sql } from 'drizzle-orm';
import { db } from '../../config/db';
import { newsletterSubscribers } from '../../config/db/schema';

type Filtro = { busca?: string; situacao?: 'ativos' | 'sairam' | 'todos'; origem?: string };

function condicoes(f: Filtro) {
    const partes = [];

    if (f.situacao === 'ativos') partes.push(isNull(newsletterSubscribers.unsubscribedAt));
    else if (f.situacao === 'sairam') partes.push(isNotNull(newsletterSubscribers.unsubscribedAt));

    if (f.origem && f.origem !== 'todas') partes.push(eq(newsletterSubscribers.source, f.origem));

    const termo = f.busca?.trim();
    if (termo) {
        const like = `%${termo}%`;
        const busca = or(ilike(newsletterSubscribers.email, like), ilike(newsletterSubscribers.name, like));
        if (busca) partes.push(busca);
    }

    return partes.length ? and(...partes) : undefined;
}

export function listar(f: Filtro & { limite: number; deslocamento: number }) {
    return db
        .select()
        .from(newsletterSubscribers)
        .where(condicoes(f))
        .orderBy(desc(newsletterSubscribers.createdAt))
        .limit(f.limite)
        .offset(f.deslocamento);
}

export async function contar(f: Filtro): Promise<number> {
    const [linha] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(newsletterSubscribers)
        .where(condicoes(f));
    return linha?.n ?? 0;
}

// Números do topo da tela. Uma consulta só: a lista pode ter dezenas de milhares
// de linhas e três consultas separadas seria varrer a tabela três vezes.
export async function resumo() {
    const [linha] = await db
        .select({
            total: sql<number>`count(*)::int`,
            ativos: sql<number>`count(*) filter (where ${newsletterSubscribers.unsubscribedAt} is null)::int`,
            sairam: sql<number>`count(*) filter (where ${newsletterSubscribers.unsubscribedAt} is not null)::int`,
            ultimos7: sql<number>`count(*) filter (where ${newsletterSubscribers.createdAt} > now() - interval '7 days')::int`,
        })
        .from(newsletterSubscribers);
    return linha ?? { total: 0, ativos: 0, sairam: 0, ultimos7: 0 };
}

export async function origens() {
    return db
        .select({ origem: newsletterSubscribers.source, n: sql<number>`count(*)::int` })
        .from(newsletterSubscribers)
        .groupBy(newsletterSubscribers.source)
        .orderBy(desc(sql`count(*)`));
}

// Exportação: sem paginação de propósito — o arquivo tem que sair inteiro.
export function todosParaExportar(f: Filtro) {
    return db
        .select({
            email: newsletterSubscribers.email,
            name: newsletterSubscribers.name,
            source: newsletterSubscribers.source,
            createdAt: newsletterSubscribers.createdAt,
            unsubscribedAt: newsletterSubscribers.unsubscribedAt,
        })
        .from(newsletterSubscribers)
        .where(condicoes(f))
        .orderBy(desc(newsletterSubscribers.createdAt));
}
