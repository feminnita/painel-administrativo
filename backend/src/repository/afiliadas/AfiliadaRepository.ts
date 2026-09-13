import { sql } from 'drizzle-orm';
import { db } from '../../config/db';

/**
 * Quanto cada afiliada tem A RECEBER.
 *
 * "A pagar" = comissao dos pedidos PAGOS e nao cancelados MENOS o que ja saiu
 * em affiliate_payouts. Sem descontar o que ja foi pago, a tela mostraria o
 * total historico para sempre e a Chris pagaria duas vezes a mesma venda.
 *
 * Pedido pendente ou cancelado nao entra: comissao e sobre venda que aconteceu.
 */
export async function listar() {
    const { rows } = await db.execute(sql`
        SELECT
            a.id,
            a.name                                  AS nome,
            a.email,
            a.phone                                 AS telefone,
            a.instagram,
            a.code                                  AS codigo,
            a.status,
            a.commission_rate::float                AS percentual,
            a.pix_key                               AS chave_pix,
            a.notes                                 AS observacoes,
            a.created_at                            AS criada_em,
            COUNT(o.id) FILTER (
                WHERE o.payment_status = 'paid' AND o.status <> 'cancelled'
            )::int                                  AS pedidos,
            COALESCE(SUM(o.total::numeric) FILTER (
                WHERE o.payment_status = 'paid' AND o.status <> 'cancelled'
            ), 0)::float                            AS vendido,
            COALESCE(SUM(o.affiliate_commission::numeric) FILTER (
                WHERE o.payment_status = 'paid' AND o.status <> 'cancelled'
            ), 0)::float                            AS comissao,
            COALESCE((
                SELECT SUM(p.amount::numeric) FROM affiliate_payouts p
                WHERE p.affiliate_id = a.id
            ), 0)::float                            AS pago
        FROM affiliates a
        LEFT JOIN orders o ON o.affiliate_id = a.id
        GROUP BY a.id
        ORDER BY
            -- pendentes primeiro: sao as que esperam decisao dela
            (a.status = 'pendente') DESC,
            comissao DESC,
            a.name
    `);

    return rows.map((r: any) => ({
        ...r,
        a_pagar: Number((Number(r.comissao) - Number(r.pago)).toFixed(2)),
    }));
}

/** Pedidos que uma afiliada trouxe, para a Chris conferir de onde vem o valor. */
export async function pedidosDa(afiliadaId: string) {
    const { rows } = await db.execute(sql`
        SELECT
            o.order_number                    AS pedido,
            o.created_at                      AS quando,
            o.status,
            o.payment_status                  AS pagamento,
            o.total::float                    AS total,
            o.affiliate_rate::float           AS percentual,
            o.affiliate_commission::float     AS comissao
        FROM orders o
        WHERE o.affiliate_id = ${afiliadaId}
        ORDER BY o.created_at DESC
        LIMIT 200
    `);
    return rows;
}

type Campos = {
    status?: string;
    percentual?: number;
    chavePix?: string | null;
    observacoes?: string | null;
    codigo?: string;
};

const STATUS_VALIDOS = ['pendente', 'aprovada', 'pausada', 'bloqueada'];

export async function atualizar(id: string, campos: Campos) {
    const partes = [];

    if (campos.status && STATUS_VALIDOS.includes(campos.status)) {
        partes.push(sql`status = ${campos.status}::affiliate_status`);
        // Carimba a aprovacao na primeira vez, e so na primeira.
        if (campos.status === 'aprovada') {
            partes.push(sql`approved_at = coalesce(approved_at, now())`);
        }
    }
    if (typeof campos.percentual === 'number' && campos.percentual >= 0 && campos.percentual <= 100) {
        partes.push(sql`commission_rate = ${campos.percentual}`);
    }
    if (campos.chavePix !== undefined) partes.push(sql`pix_key = ${campos.chavePix}`);
    if (campos.observacoes !== undefined) partes.push(sql`notes = ${campos.observacoes}`);
    if (campos.codigo) {
        const limpo = campos.codigo.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 32);
        if (limpo) partes.push(sql`code = ${limpo}`);
    }

    if (!partes.length) return;

    await db.execute(sql`
        UPDATE affiliates SET ${sql.join(partes, sql`, `)} WHERE id = ${id}
    `);
}

/** Registra que a Chris pagou. E o que faz o "a pagar" baixar. */
export async function registrarPagamento(
    afiliadaId: string,
    valor: number,
    forma?: string,
    observacao?: string,
) {
    const { rows } = await db.execute(sql`
        INSERT INTO affiliate_payouts (affiliate_id, amount, method, note)
        VALUES (${afiliadaId}, ${valor}, ${forma ?? null}, ${observacao ?? null})
        RETURNING id
    `);
    return rows[0];
}

export async function pagamentosDe(afiliadaId: string) {
    const { rows } = await db.execute(sql`
        SELECT id, amount::float AS valor, method AS forma, note AS observacao, paid_at AS pago_em
        FROM affiliate_payouts
        WHERE affiliate_id = ${afiliadaId}
        ORDER BY paid_at DESC
        LIMIT 100
    `);
    return rows;
}
