import { Request, Response } from 'express';
import * as CustomerRepository from '../../repository/customers/CustomerRepository';

export async function list(req: Request, res: Response) {
    try {
        const customers = await CustomerRepository.listWithStatus();
        res.json(customers);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao listar clientes' });
    }
}

export async function detail(req: Request, res: Response) {
    const id = req.params.id as string;
    
    try {
        const customer = await CustomerRepository.findById(id);
        if (!customer) {
            return res.status(404).json({ error: 'Cliente não encontrado(a)' });
        }

        const orders = await CustomerRepository.ordersByCustomer(id);
        res.json({ customer, orders });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar cliente' });
    }
}