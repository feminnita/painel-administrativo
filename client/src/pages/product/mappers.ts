import type { AdminProduct, Color, ProductInput, Sku } from "./types";
import type { CategoryRow } from "@/lib/categories";

type ApiProduct = Record<string, any>;

export function mapApiProduct(p: ApiProduct): AdminProduct {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description ?? null,
    code: p.code ?? null,
    category_id: p.categoryId ?? null,
    base_price: Number(p.basePrice) || 0,
    pix_price: p.pixPrice == null ? null : Number(p.pixPrice),
    sale_price: p.salePrice == null ? null : Number(p.salePrice),
    stock: p.stock ?? 0,
    active: p.active ?? true,
    featured: p.featured ?? false,
    is_new: p.isNew ?? false,
    is_bestseller: p.isBestseller ?? false,
    images: Array.isArray(p.images) ? p.images : [],
    video_url: p.videoUrl ?? null,
    weight_kg: p.weightKg == null ? null : Number(p.weightKg),
    pkg_height_cm: p.pkgHeightCm == null ? null : Number(p.pkgHeightCm),
    pkg_width_cm: p.pkgWidthCm == null ? null : Number(p.pkgWidthCm),
    pkg_length_cm: p.pkgLengthCm == null ? null : Number(p.pkgLengthCm),
    colors: Array.isArray(p.colors) ? p.colors : [],
    sizes: Array.isArray(p.sizes) ? p.sizes : [],
    size_chart: p.sizeChart ?? {},
    meta_title: p.metaTitle ?? null,
    meta_description: p.metaDescription ?? null,
    created_at: p.createdAt ?? "",
  };
}

export function toApiProduct(f: ProductInput): Record<string, unknown> {
  return {
    name: f.name,
    slug: f.slug,
    description: f.description,
    code: f.code,
    categoryId: f.category_id,
    basePrice: f.base_price,
    pixPrice: f.pix_price,
    salePrice: f.sale_price,
    stock: f.stock,
    active: f.active,
    featured: f.featured,
    isNew: f.is_new,
    isBestseller: f.is_bestseller,
    images: f.images,
    videoUrl: f.video_url,
    weightKg: f.weight_kg,
    pkgHeightCm: f.pkg_height_cm,
    pkgWidthCm: f.pkg_width_cm,
    pkgLengthCm: f.pkg_length_cm,
    colors: f.colors,
    sizes: f.sizes,
    sizeChart: f.size_chart,
    metaTitle: f.meta_title,
    metaDescription: f.meta_description,
  };
}

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
    created_at: c.createdAt ?? "",
  };
}

export function mapApiColor(c: Record<string, any>): Color {
  return { id: c.id, name: c.name, image_url: c.imageUrl };
}

export function mapApiSku(s: ApiProduct, color: string): Sku {
  return {
    id: s.id,
    size: s.size,
    color,
    stock_qty: s.stockQty ?? 0,
    price: s.price == null ? null : Number(s.price),
    sale_price: s.salePrice == null ? null : Number(s.salePrice),
    cost_price: s.costPrice == null ? null : Number(s.costPrice),
    reference: s.reference ?? null,
    ean: s.ean ?? null,
    min_stock: s.minStock == null ? null : Number(s.minStock),
    sale_start: s.saleStart ?? null,
    sale_end: s.saleEnd ?? null,
    active: s.active ?? true,
    availability: s.availability ?? null,
    out_of_stock_action: s.outOfStockAction ?? null,
    weight_g: s.weightG == null ? null : Number(s.weightG),
    height_cm: s.heightCm == null ? null : Number(s.heightCm),
    width_cm: s.widthCm == null ? null : Number(s.widthCm),
    length_cm: s.lengthCm == null ? null : Number(s.lengthCm),
    position: s.position == null ? null : Number(s.position),
  };
}

export function toApiSku(s: Sku): Record<string, unknown> {
  return {
    size: s.size,
    color: s.color || null,
    stockQty: s.stock_qty,
    price: s.price,
    salePrice: s.sale_price,
    costPrice: s.cost_price,
    reference: s.reference,
    ean: s.ean,
    minStock: s.min_stock,
    saleStart: s.sale_start,
    saleEnd: s.sale_end,
    active: s.active,
    availability: s.availability,
    outOfStockAction: s.out_of_stock_action,
    weightG: s.weight_g,
    heightCm: s.height_cm,
    widthCm: s.width_cm,
    lengthCm: s.length_cm,
    position: s.position,
  };
}
