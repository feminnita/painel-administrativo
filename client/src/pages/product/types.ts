export const BRANDS = ["Armmís"] as const;
export type Brand = (typeof BRANDS)[number];

export type AdminProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  code: string | null;
  reference: string | null;
  brand: Brand | null;
  category_id: string | null;
  base_price: number;
  cost_price: number | null;
  pix_price: number | null;
  sale_price: number | null;
  sale_start: string | null;
  sale_end: string | null;
  /** Desconto programado: preço especial numa data marcada, por cima do sale_price. */
  promo_prog_preco: number | null;
  promo_prog_inicio: string | null;
  promo_prog_fim: string | null;
  /** Lançamento: o produto só aparece na loja no início. */
  promo_prog_lancamento: boolean;
  /** Texto da etiqueta no site enquanto a promoção especial está no ar. */
  promo_prog_selo: string | null;
  /** Etiqueta "Chegou reposição" no site até esta data (7 dias a partir do clique). */
  reposicao_ate: string | null;
  /** Cores que chegaram (o botão fica ao lado de cada cor nas variações). */
  reposicao_cores: string[];
  /** Somente leitura: o servidor já pôs o preço especial no ar. */
  promo_prog_aplicada: boolean;
  stock: number;
  active: boolean;
  visible_in_store: boolean;
  featured: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  is_outlet: boolean;
  images: string[];
  video_url: string | null;
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
  /** Nº de produtos que usam a cor — ordena as sugestões (mais usadas primeiro). */
  usage?: number;
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
  id?: string;
  size: string;
  color: string;
  stock_qty: number; // somente-leitura no painel (fonte: StockHub)
  price: number | null;
  sale_price: number | null;
  sale_start: string | null;
  sale_end: string | null;
  reference: string | null;
  min_stock: number | null;
  active: boolean;
  has_orders?: boolean;
};

export type ColorImages = {
  color: string;
  images: string[];
};

export type ProductInput = Omit<AdminProduct, "id" | "created_at">;
