import * as ProductColorRepository from '../../repository/product/ProductColorRepository';

function normalizeName(s: string) {
    return s
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]/g, '');
}

export function listColors() {
    return ProductColorRepository.findAllWithUsage();
}

export async function getColor(id: string) {
    const color = await ProductColorRepository.findById(id);
    if (!color) throw new Error('COLOR_NOT_FOUND');
    return color;
}

export async function createColor(input: { name: string; imageUrl: string }) {
    const target = normalizeName(input.name);
    const existing = await ProductColorRepository.findAll();
    const match = existing.find((c) => normalizeName(c.name) === target);
    if (match) return match;
    return ProductColorRepository.insert(input);
}

export async function updateColor(id: string, input: Record<string, unknown>) {
    const color = await ProductColorRepository.update(id, input);
    if (!color) throw new Error('COLOR_NOT_FOUND');
    return color;
}

export async function deleteColor(id: string) {
    const color = await ProductColorRepository.remove(id);
    if (!color) throw new Error('COLOR_NOT_FOUND');
    return color;
}