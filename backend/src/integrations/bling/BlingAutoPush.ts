import * as OrderRepository from '../../repository/orders/OrderRepository';
import * as BlingOrderService from './BlingOrderService';
import * as TokenService from './TokenService';

const INTERVAL_MS = 2 * 60 * 1000;

let running = false;

async function tick(): Promise<void> {
    if (running) return;
    running = true;

    try {
        if (!TokenService.isBlingConfigured()) return;

        const token = await TokenService.getAccessToken();
        if (!token) return;

        const pending = await OrderRepository.findPaidOrdersWithoutBling();

        for (const order of pending) {
            try {
                const { blingOrderId } = await BlingOrderService.pushOrder(order.id);
                console.log(`[BLING AUTO-PUSH] ${order.orderNumber} -> Bling ${blingOrderId}`);
            } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                if (msg.startsWith('ALREADY_PUSHED')) continue;
                console.error(`[BLING AUTO-PUSH] falha no ${order.orderNumber}: ${msg}`);
            }
        }
    } catch (error) {
        console.error('[BLING AUTO-PUSH] ciclo falhou:', error);
    } finally {
        running = false;
    }
}

export function startBlingAutoPush(): void {
    setInterval(tick, INTERVAL_MS);
    setTimeout(tick, 10 * 1000);
    console.log('[BLING AUTO-PUSH] ativo — verificando pedidos pagos a cada 2 minutos');
}
