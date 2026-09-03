import * as CategoryRepository from '../../repository/product/CategoryRepository';

export function listCategories() {
    return CategoryRepository.findAll();
}

export async function getCategory(id: string) {
    const category = await CategoryRepository.findById(id);
    if (!category) throw new Error('CATEGORY_NOT_FOUND');
    return category;
}

export function createCategory(input: {
    name: string;
    slug: string;
    description?: string;
    imageUrl?: string;
    parentId?: string;
    orderIndex?: number;
    pickOrder?: number;
}) {
    return CategoryRepository.insert(input);
}

export async function updateCategory(id: string, input: Record<string, unknown>) {
    const category = await CategoryRepository.update(id, input);
    if (!category) throw new Error('CATEGORY_NOT_FOUND');
    return category;
}

export async function deactvateCategory(id: string) {
    const category = await CategoryRepository.deactivate(id);
    if (!category) throw new Error('CATEGORY_NOT_FOUND');
    return category;
}

export function listProductCounts() {
    return CategoryRepository.countProductsByCategory();
}

export function reorderCategories(updates: {
    id: string;
    orderIndex: number
}[]) {

    if (!Array.isArray(updates) || updates.length === 0) throw new Error('N)_UPDATES');
    return CategoryRepository.reorderCategories(updates);

}

export async function deleteCategory(id: string) {
    const category = await CategoryRepository.remove(id);
    if (!category) throw new Error('CATEGORY_NOT_FOUND');
    return category;
}
