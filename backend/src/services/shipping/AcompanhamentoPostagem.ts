import { sql } from 'drizzle-orm';
import { db } from '../../config/db';
import * as MelhorEnvio from '../../integrations/melhorEnvio/client/MelhorEnvioClients';
import { CLARAMEL, MAP_OLARIA } from '../../integrations/melhorEnvio/domain/AgenciasDePostagem';
import { diaEmBrasilia, diasUteisEntre, prazosDaCompra, situacaoDaPostagem } from '../../domain/shipping/prazoPostagem';

/**
 * Acompanhamento de postagem: todo pedido pago que ainda nao foi entregue, com
 * a etapa em que o Melhor Envio diz que ele esta e o prazo em dias uteis.
 *
 * Existe porque a loja so descobria pacote parado quando a cliente reclamava
 * (15/10/2026: a Claramel segurava pacotes no balcao sem bipar).
 *
 * A etapa e lida AO VIVO em /me/orders/{id} (o /me/shipment/tracking devolve
 * dado velho — ver getTrackingCode). Para nao martelar o Melhor Envio a cada
 * clique, a resposta fica guardada 2 minutos.
 */

const NOMES_DOS_PONTOS: Record<number, string> = {
    [CLARAMEL]: 'Claramel',
    33716: 'Claramel',
    [MAP_OLARIA]: 'MAP Olaria',
};

const DIAS_PARA_TRAS = 60;
const GUARDA_MS = 2 * 60 * 1000;
const EM_PARALELO = 5;

export type Etapa = 'sem_etiqueta' | 'etiqueta_paga' | 'recebido_no_ponto' | 'postado' | 'etiqueta_cancelada' | 'erro_consulta';

export type LinhaPostagem = {
    orderId: string;
    orderNumber: string;
    cliente: string;
    telefone: string | null;
    compra: string;
    total: number;
    transportadora: string | null;
    ponto: string | null;
    rastreio: string | null;
    etapa: Etapa;
    bipadoEm: string | null;
    limite: string;
    situacao: ReturnType<typeof situacaoDaPostagem>['situacao'];
    diasDeAtraso: number;
    // So para quem ja foi bipado: passou do prazo de entrega da transportadora?
    entregaAtrasada: boolean;
    // O ponto bipou o recebimento, mas a transportadora nao recolheu em 2 dias
    // uteis: o pacote esta parado no balcao (o caso da Claramel, 15/10/2026).
    paradoNoPonto: boolean;
};

let guardado: { em: number; dados: LinhaPostagem[] } | null = null;

// Datas do Melhor Envio vem sem fuso, no horario de Brasilia.
const deBrasilia = (s: string | null | undefined) => (s ? new Date(`${s.replace(' ', 'T')}-03:00`) : null);

async function pedidosAbertos() {
    const r = await db.execute(sql`
        select o.id, o.order_number as "orderNumber", o.created_at as "createdAt", o.total,
               o.shipping_method as "shippingMethod", o.me_order_id as "meOrderId",
               o.tracking_code as "trackingCode", c.name as "cliente", c.phone as "telefone"
        from orders o
        left join customers c on c.id = o.customer_id
        where o.payment_status = 'paid'
          and o.status not in ('cancelled', 'delivered')
          and o.shipping_service_id is not null
          and o.created_at > now() - (${DIAS_PARA_TRAS} || ' days')::interval
        order by o.created_at asc
    `);
    return r.rows as {
        id: string; orderNumber: string; createdAt: Date | string; total: string;
        shippingMethod: string | null; meOrderId: string | null; trackingCode: string | null;
        cliente: string | null; telefone: string | null;
    }[];
}

async function montarLinha(p: Awaited<ReturnType<typeof pedidosAbertos>>[number], agora: Date): Promise<LinhaPostagem | null> {
    let etapa: Etapa = 'sem_etiqueta';
    let bipado: Date | null = null;
    let ponto: string | null = null;
    let rastreio = p.trackingCode;
    let prazoEntrega: number | null = null;

    if (p.meOrderId) {
        try {
            const me = await MelhorEnvio.getOrder(p.meOrderId);
            if (me.status === 'delivered') return null; // ja chegou: sai da lista
            const recebido = deBrasilia(me.received_at);
            const postado = deBrasilia(me.posted_at);
            bipado = recebido ?? postado;
            etapa = me.status === 'canceled' ? 'etiqueta_cancelada'
                : postado ? 'postado'
                : recebido ? 'recebido_no_ponto'
                : me.generated_at || me.status === 'released' ? 'etiqueta_paga'
                : 'sem_etiqueta';
            ponto = me.agency_id ? NOMES_DOS_PONTOS[me.agency_id] ?? `ponto ${me.agency_id}` : null;
            rastreio = me.tracking || me.self_tracking || rastreio;
            prazoEntrega = me.delivery_max ?? null;
        } catch {
            etapa = 'erro_consulta';
        }
    }

    const s = situacaoDaPostagem(p.createdAt, bipado, agora);
    const diasDesdeOBip = bipado ? diasUteisEntre(diaEmBrasilia(bipado), diaEmBrasilia(agora)) : 0;
    const entregaAtrasada = !!bipado && prazoEntrega !== null && diasDesdeOBip > prazoEntrega;
    const paradoNoPonto = etapa === 'recebido_no_ponto' && diasDesdeOBip >= 2;

    return {
        orderId: p.id,
        orderNumber: p.orderNumber,
        cliente: p.cliente ?? '',
        telefone: p.telefone,
        compra: new Date(p.createdAt).toISOString(),
        total: Number(p.total),
        transportadora: p.shippingMethod,
        ponto,
        rastreio,
        etapa,
        bipadoEm: bipado ? bipado.toISOString() : null,
        limite: prazosDaCompra(p.createdAt).limite,
        situacao: s.situacao,
        diasDeAtraso: s.diasDeAtraso,
        entregaAtrasada,
        paradoNoPonto,
    };
}

export async function listar(forcar = false): Promise<LinhaPostagem[]> {
    if (!forcar && guardado && Date.now() - guardado.em < GUARDA_MS) return guardado.dados;

    const pedidos = await pedidosAbertos();
    const agora = new Date();
    const linhas: LinhaPostagem[] = [];
    for (let i = 0; i < pedidos.length; i += EM_PARALELO) {
        const lote = await Promise.all(pedidos.slice(i, i + EM_PARALELO).map((p) => montarLinha(p, agora)));
        for (const l of lote) if (l) linhas.push(l);
    }

    guardado = { em: Date.now(), dados: linhas };
    return linhas;
}
