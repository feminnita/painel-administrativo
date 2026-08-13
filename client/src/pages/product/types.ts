export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  code: string | null;
  category_id: string | null;
  base_price: number;
  pix_price: number | null;
  sale_price: number | null;
  stock: number;
  active: boolean;
  featured: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  images: string[];
  weight_kg: number | null;
  pkg_height_cm: number | null;
  pkg_width_cm: number | null;
  pkg_length_cm: number | null;
  colors: string[];
  sizes: string[];
  size_chart: Record<string, Record<string, string>>;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
};

export type Color = {
  id: string;
  name: string;
  image_url: string;
};

export type ProductSortKey = "created_at" | "name" | "base_price" | "stock";

export type ProductFilters = {
  search?: string;
  categoryId?: string;
  status?: "" | "active" | "inactive";
  sortBy?: ProductSortKey;
  sortDir?: "asc" | "desc";
};

export type Sku = {
  size: string;
  color: string;
  stock_qty: number;
};

export type ColorImages = {
  color: string;
  images: string[];
};

export type ProductInput = Omit<AdminProduct, "id" | "created_at">;
