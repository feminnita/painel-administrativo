import { and, desc, eq, isNull, isNotNull } from 'drizzle-orm';
import { db } from '../../config/db';
import { atendimentoCasos } from '../../config/db/schema';

// Um caso aberto por telefone: se a Lia passar a mesma cliente de novo antes do
// "Atendido", so atualiza o resumo (nao duplica na fila).
export async function abrirOuAtualizar(c: { telefone: string; nome?: string; resumo: string; ultimaMensagem?: string; origem?: string }) {
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
}

export const listarAbertos = () =>
    db.select().from(atendimentoCasos).where(isNull(atendimentoCasos.atendidoEm)).orderBy(atendimentoCasos.criadoEm);

export const listarAtendidosRecentes = () =>
    db.select().from(atendimentoCasos).where(isNotNull(atendimentoCasos.atendidoEm)).orderBy(desc(atendimentoCasos.atendidoEm)).limit(20);

export async function marcarAtendido(id: string, quem: string) {
    const r = await db.update(atendimentoCasos).set({ atendidoEm: new Date(), atendidoPor: quem })
        .where(and(eq(atendimentoCasos.id, id), isNull(atendimentoCasos.atendidoEm)))
        .returning({ id: atendimentoCasos.id, telefone: atendimentoCasos.telefone });
    return r[0] ?? null;
}
