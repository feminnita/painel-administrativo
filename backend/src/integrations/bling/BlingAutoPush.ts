import * as OrderRepository from '../../repository/orders/OrderRepository';
import * as BlingOrderService from './BlingOrderService';
import * as TokenService from './TokenService';

const INTERVAL_MS = 2 * 60 * 1000;

let running = false;

/**
 * Empurra todos os pedidos pagos ainda sem pedido no Bling.
 * - Token pego UMA vez por ciclo. Sem token = Bling ainda nao conectado:
 *   apenas avisa e retorna, sem marcar erro em pedido nenhum.
 * - Cada pedido roda isolado: falha vira pendencia visivel
 *   (bling_push_status='error' + bling_push_error) e NUNCA derruba o lote.
 * - Idempotencia garantida por blingOrderId (pushOrder recusa duplicado)
 *   + filtro findPaidOrdersToPush.
 */
export async function pushPaidOrders(): Promise<void> {
    if (!TokenService.isBlingConfigured()) return;

    const token = await TokenService.getAccessToken();
    if (!token) {
        console.warn('[BLING AUTO-PUSH] sem token — Bling nao conectado; nada marcado como erro');
        return;
    }

    const pending = await OrderRepository.findPaidOrdersToPush();

    for (const order of pending) {
        try {
            const { blingOrderId } = await BlingOrderService.pushOrder(order.id);
            await OrderRepository.markPushed(order.id);
            console.log(`[BLING AUTO-PUSH] ${order.orderNumber} -> Bling ${blingOrderId}`);
        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);

            // Ja existe no Bling: nao e falha, so consolida o status.
            if (msg.startsWith('ALREADY_PUSHED')) {
                await OrderRepository.markPushed(order.id);
                continue;
            }

            await OrderRepository.saveBlingPushError(order.id, msg);
            console.error(`[BLING AUTO-PUSH] falha no ${order.orderNumber}: ${msg}`);
            continue;
        }
    }
}

async function tick(): Promise<void> {
    if (running) return; // lock em memoria — nao sobrepoe ciclos
    running = true;

    try {
        await pushPaidOrders();
    } catch (error) {
        console.error('[BLING AUTO-PUSH] ciclo falhou:', error);
    } finally {
        running = false;
    }
}

export function startBlingAutoPush(intervalMs: number = INTERVAL_MS): void {
    setInterval(tick, intervalMs);
    setTimeout(tick, 10 * 1000);
    console.log('[BLING AUTO-PUSH] ativo — verificando pedidos pagos a cada 2 minutos');
}
