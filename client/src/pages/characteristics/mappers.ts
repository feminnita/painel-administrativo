import type { Color } from "./types";

export function mapApiColor(c: Record<string, any>): Color {
    return { id: c.id, name: c.name, image_url: c.imageUrl };
}

export function toApiColor(input: { name: string; image_url: string }) {
    return { name: input.name, imageUrl: input.image_url };
}
