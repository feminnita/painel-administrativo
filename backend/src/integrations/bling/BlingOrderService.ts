import * as OrderRepository from '../../repository/orders/OrderRepository';
import * as BlingApi from './BlingApi';
import * as BlingDomain from './BlingDomain';
import * as TokenService from './TokenService';

async function ensureBlingContact(
    token: string,
    customer: { name: string; email: string; cpf: string | null; phone: string | null },
    addr: Record<string, string>,
): Promise<number> {
    const cpf = (customer.cpf ?? '').replace(/\D/g, '');
    if (!cpf) throw new Error('CUSTOMER_WITHOUT_CPF');

    const found = await BlingApi.searchContacts(token, cpf);
    const match = found.find(
        (c) => (c.numeroDocumento ?? '').replace(/\D/g, '') === cpf,
    );
    if (match) return match.id;

    const created = await BlingApi.postContact(token, {
        nome: customer.name,
        tipo: 'F',
        // Bling v3 exige situacao no contato: enum de 1 letra "A"|"I"|"E"|"S".
        situacao: 'A',
        indicadorIe: 9,
        numeroDocumento: cpf,
        email: customer.email,
        celular: (customer.phone ?? '').replace(/\D/g, ''),
        endereco: {
            geral: {
                endereco: addr.street || '',
                numero: addr.number || 'S/N',
                complemento: addr.complement || '',
                bairro: addr.neighborhood || '',
                cep: (addr.cep || '').replace(/\D/g, ''),
                municipio: addr.city || '',
                uf: addr.state || '',
            },
        },
    });

    const contactId = created?.data?.id;
    if (!contactId) throw new Error('BLING_CONTACT_CREATE_FAILED');

    return contactId;
}

export async function pushOrder(orderId: string): Promise<{ blingOrderId: number }> {
    const token = await TokenService.getAccessToken();
    if (!token) throw new Error('BLING_NOT_CONNECTED');

    const order = await OrderRepository.findById(orderId);
    if (!order) throw new Error('ORDER_NOT_FOUND');

    if (order.blingOrderId) {
        throw new Error(`ALREADY_PUSHED:${order.blingOrderId}`);
    }

    const [items, customer] = await Promise.all([
        OrderRepository.findItemsForBling(orderId),
        order.customerId
            ? OrderRepository.findCustomerForShipping(order.customerId)
            : Promise.resolve(null),
    ]);

    if (!items.length) throw new Error('ORDER_WITHOUT_ITEMS');
    if (!customer) throw new Error('CUSTOMER_NOT_FOUND');

    // TRAVA: todo item precisa de bling_id válido (skuBlingId ou productBlingId).
    // Sem ele, o Bling casaria por código/descrição e CRIARIA um cadastro novo em
    // vez de recusar. Falhar alto: o pedido NÃO é empurrado e o erro fica visível
    // no painel (bling_push_status='error' + bling_push_error), nunca cria cadastro.
    const semBling = items.filter((it) => !(it.skuBlingId ?? it.productBlingId));
    if (semBling.length) {
        const refs = semBling
            .map((it) => it.productCode || it.productName || '?')
            .join(', ');
        throw new Error(
            `MISSING_BLING_ID: itens sem vínculo no Bling (${refs}). Pedido não empurrado para não criar cadastro novo — vincule no Bling e reenvie.`,
        );
    }

    const addr = (order.shippingAddress ?? {}) as Record<string, string>;
    const contactId = await ensureBlingContact(token, customer, addr);

    const payload = BlingDomain.buildSalesOrderPayload(
        { order, items, customer: customer ?? null },
        new Date(),
        contactId,
    );

    const result = await BlingApi.postSalesOrder(token, payload);
    const blingOrderId = result?.data?.id;

    if (!blingOrderId) throw new Error('BLING_NO_ORDER_ID');

    await OrderRepository.saveBlingOrderId(orderId, blingOrderId);

    return { blingOrderId };
}