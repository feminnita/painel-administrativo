import type { AdminProduct, Color, ProductInput } from "./types";
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
    pick_order: c.pickOrder ?? 0,
    created_at: c.createdAt ?? "",
  };
}

export function mapApiColor(c: Record<string, any>): Color {
  return { id: c.id, name: c.name, image_url: c.imageUrl };
}
