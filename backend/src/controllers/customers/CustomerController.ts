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
        const bloqueio = await CustomerRepository.bloqueioDaCliente(id);
        res.json({ customer, orders, bloqueio });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar cliente' });
    }
}

export async function bloquear(req: Request, res: Response) {
    const id = req.params.id as string;
    const motivo = String(req.body?.motivo ?? '').trim();
    if (!motivo) return res.status(400).json({ error: 'Informe o motivo do bloqueio' });
    try {
        const ok = await CustomerRepository.bloquear(id, motivo);
        if (!ok) return res.status(400).json({ error: 'Cliente sem CPF válido: não dá para bloquear' });
        res.json({ bloqueio: await CustomerRepository.bloqueioDaCliente(id) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao bloquear cliente' });
    }
}

export async function desbloquear(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
        const ok = await CustomerRepository.desbloquear(id);
        if (!ok) return res.status(400).json({ error: 'Cliente sem CPF válido' });
        res.json({ bloqueio: null });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao desbloquear cliente' });
    }
}