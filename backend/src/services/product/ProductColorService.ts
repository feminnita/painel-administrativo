import * as ProductColorRepository from '../../repository/product/ProductColorRepository';

export function listColors() {
    return ProductColorRepository.findAll();
}

export async function getColor(id: string) {
    const color = await ProductColorRepository.findById(id);
    if (!color) throw new Error('COLOR_NOT_FOUND');
    return color;
}

export function createColor(input: { name: string; imageUrl: string }) {
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