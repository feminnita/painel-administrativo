import type { CategoryInput, CategoryRow } from "./types";

export function mapApiCategory(c: Record<string, any>): CategoryRow {
    return {
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description ?? null,
        image_url: c.imageUrl ?? null,
        parent_id: c.parentId ?? null,
        active: c.active ?? true,
        order_index: c.orderIndex ?? 0,
        pick_order: c.pickOrder ?? 0,
        created_at: c.createdAt ?? "",
    };
}

export function toApiCategory(input: CategoryInput) {
    return {
        name: input.name,
        slug: input.slug,
        description: input.description,
        imageUrl: input.image_url,
        parentId: input.parent_id,
        active: input.active,
        orderIndex: input.order_index,
        pickOrder: input.pick_order,
    };
}
