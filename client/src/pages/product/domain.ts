import type { AdminProduct, ProductFilters, ProductInput } from "./types";

export function filterAndSortProducts(
    products: AdminProduct[],
    filters: ProductFilters,
): AdminProduct[] {
    const {
        search = "",
        categoryId = "",
        status = "",
        sortBy = "created_at",
        sortDir = "desc",
    } = filters;

    const term = search.toLowerCase();

    const filtered = products.filter((p) => {
        if (
            term &&
            !p.name.toLowerCase().includes(term) &&
            !(p.code ?? "").toLowerCase().includes(term)
        )
            return false;

        if (categoryId && p.category_id !== categoryId) return false;
        if (status === "active" && !p.active) return false;
        if (status === "inactive" && p.active) return false;

        return true;
    });

    return filtered.sort((a, b) => {
        const va = a[sortBy];
        const vb = b[sortBy];
        const na = typeof va === "string" ? va.toLowerCase() : va;
        const nb = typeof vb === "string" ? vb.toLowerCase() : vb;

        if (na < nb) return sortDir === "asc" ? -1 : 1;
        if (na > nb) return sortDir === "asc" ? 1 : -1;

        return 0;
    });
}

const LETTER_SIZE_ORDER = ["PP", "P", "M", "G", "GG", "XG", "XGG", "XXG", "XXGG"];

/** Rank de tamanho de vestuario: letras (PP..XGG) primeiro, numericos crescentes depois. */
export function sizeRank(raw: string): number {
    const s = String(raw ?? "").trim().toUpperCase();
    const idx = LETTER_SIZE_ORDER.indexOf(s);
    if (idx !== -1) return idx;
    const n = Number.parseInt(s, 10);
    if (Number.isFinite(n)) return 1000 + n;
    return 5000;
}

export function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/gu, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
}

export function emptyProduct(): ProductInput {
    return {
        name: "",
        slug: "",
        description: "",
        code: "",
        reference: null,
        brand: null,
        category_id: null,
        base_price: 0,
        cost_price: null,
        pix_price: null,
        sale_price: null,
        sale_start: null,
        sale_end: null,
        stock: 0,
        active: true,
        visible_in_store: true,
        featured: false,
        is_new: true,
        is_bestseller: false,
        images: [],
        video_url: null,
        weight_kg: 0.3,
        pkg_height_cm: 5,
        pkg_width_cm: 15,
        pkg_length_cm: 20,
        colors: [],
        sizes: [],
        size_chart: {},
        meta_title: null,
        meta_description: null,
    };
}

export function buildProductPayload(
    form: ProductInput,
    imagesInput: string,
): ProductInput {
    const images = imagesInput
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

    return {
        ...form,
        slug: form.slug || slugify(form.name),
        description: form.description || null,
        code: form.code || null,
        reference: form.reference || null,
        brand: form.brand || null,
        category_id: form.category_id || null,
        cost_price: form.cost_price || null,
        pix_price: form.pix_price || null,
        sale_price: form.sale_price || null,
        sale_start: form.sale_start || null,
        sale_end: form.sale_end || null,
        images,
        video_url: form.video_url || null,
        colors: form.colors || [],
        weight_kg: form.weight_kg || 0.3,
        pkg_height_cm: form.pkg_height_cm || 5,
        pkg_width_cm: form.pkg_width_cm || 15,
        pkg_length_cm: form.pkg_length_cm || 20,
        sizes: form.sizes || [],
        size_chart: form.size_chart || {},
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
    };
}
