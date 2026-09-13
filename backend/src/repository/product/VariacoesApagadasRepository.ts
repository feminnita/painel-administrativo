import { and, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../../config/db';
import { variacoesApagadas, chaveVariacao } from '../../config/db/schema/product/variacoes-apagadas';

/**
 * Registra que esta combinacao cor+tamanho foi apagada DE PROPOSITO.
 *
 * Chamado pela lixeira. A partir daqui, nem o save nem "Gerar variacoes"
 * podem recriar — nem hoje, nem daqui a um mes quando o produto for reaberto
 * e a memoria da tela ja tiver morrido.
 */
export async function marcar(
    productId: string,
    color: string | null | undefined,
    size: string | null | undefined,
) {
    const colorKey = chaveVariacao(color);
    const sizeKey = chaveVariacao(size);
    if (!sizeKey) return; // sem tamanho nao ha combinacao para bloquear

    await db
        .insert(variacoesApagadas)
        .values({
            productId,
            colorKey,
            sizeKey,
            colorName: color ?? null,
            sizeName: size ?? null,
        })
        .onConflictDoNothing();
}

/**
 * Tira a marca: a Chris adicionou a variacao de proposito.
 * Sem isto, apagar uma vez bloquearia para sempre — pior que o problema.
 */
export async function desmarcar(
    productId: string,
    color: string | null | undefined,
    size: string | null | undefined,
) {
    await db.delete(variacoesApagadas).where(
        and(
            eq(variacoesApagadas.productId, productId),
            eq(variacoesApagadas.colorKey, chaveVariacao(color)),
            eq(variacoesApagadas.sizeKey, chaveVariacao(size)),
        ),
    );
}

/** As combinacoes bloqueadas de um produto, prontas para consulta rapida. */
export async function bloqueadas(productId: string): Promise<Set<string>> {
    const linhas = await db
        .select({ c: variacoesApagadas.colorKey, s: variacoesApagadas.sizeKey })
        .from(variacoesApagadas)
        .where(eq(variacoesApagadas.productId, productId));
    return new Set(linhas.map((l) => `${l.c}__${l.s}`));
}

export { chaveVariacao };
