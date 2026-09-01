import { Request, Response } from 'express';
import * as CartRepository from '../../repository/carts/CartRepository';

export async function listAbandoned(req: Request, res: Response) {
    try {
        const minMinutes = Number(req.query.minMinutes) || 60;
        const rows = await CartRepository.findAbandoned(minMinutes);

        const productIds = [
            ...new Set(rows.flatMap((r) => (r.items ?? []).map((i) => i.productId))),
        ];
        const prods = await CartRepository.findProductsByIds(productIds);
        const productById = new Map(prods.map((p) => [p.id, p]));

        const result = rows.map((row) => {
            const items = (row.items ?? []).map((item) => {
                const product = productById.get(item.productId);
                const unitPrice = Number(product?.salePrice ?? product?.basePrice ?? 0);
                return {
                    productId: item.productId,
                    name: product?.name ?? item.name,
                    size: item.size,
                    color: item.color ?? null,
                    quantity: item.quantity,
                    unitPrice,
                    totalPrice: unitPrice * item.quantity,
                    image: Array.isArray(product?.images)
                        ? product.images[0] ?? null
                        : null,
                };
            });

            return {
                customerId: row.customerId,
                customerName: row.customerName,
                customerEmail: row.customerEmail,
                customerPhone: row.customerPhone,
                updatedAt: row.updatedAt,
                items,
                total: items.reduce((sum, i) => sum + i.totalPrice, 0),
            };
        });

        res.json(result);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao listar carrinhos abandonados' });
    }
}
