import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import {
  buildTree,
  findAncestor,
  listGrandchildCategories,
} from "@/lib/categories";
import type { CategoryRow } from "@/lib/categories";
import {
  buildProductPayload,
  emptyProduct,
  filterAndSortProducts,
} from "./domain";
import {
  mapApiCategory,
  mapApiColor,
  mapApiProduct,
  mapApiSku,
  toApiProduct,
  toApiSku,
} from "./mappers";
import type {
  AdminProduct,
  Color,
  ColorImages,
  ProductInput,
  ProductSortKey,
  Sku,
} from "./types";

export function useProductsAdmin() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categoryRows, setCategoryRows] = useState<CategoryRow[]>([]);
  const [productColors, setProductColors] = useState<Color[]>([]);
  const [colorImages, setColorImages] = useState<ColorImages[]>([]);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<
    (ProductInput & { id?: string }) | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imagesInput, setImagesInput] = useState("");
  const [skus, setSkus] = useState<Sku[]>([]);
  // Ids de variações excluídas EXPLICITAMENTE pela lixeira (só essas são apagadas no save)
  const [deletedSkuIds, setDeletedSkuIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState<"" | "active" | "inactive">(
    "",
  );
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sortBy, setSortBy] = useState<ProductSortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [selectedCategoryPaiId, setSelectedCategoryPaiId] = useState<
    string | null
  >(null);
  const [selectedCategoryFilhoId, setSelectedCategoryFilhoId] = useState<
    string | null
  >(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prods, catRows, cols] = await Promise.all([
        api.get<Record<string, any>[]>("/api/admin/products"),
        api.get<Record<string, any>[]>("/api/admin/categories"),
        api.get<Record<string, any>[]>("/api/admin/colors"),
      ]);
      setProducts(prods.map(mapApiProduct));
      setCategoryRows(catRows.map(mapApiCategory));
      setProductColors(cols.map(mapApiColor));
    } catch (err) {
      console.error("Erro ao carregar produtos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categoryTree = useMemo(() => buildTree(categoryRows), [categoryRows]);
  const categories = useMemo(
    () => listGrandchildCategories(categoryRows),
    [categoryRows],
  );

  const filtered = filterAndSortProducts(products, {
    search,
    categoryId: filterCategory,
    status: filterStatus,
    sortBy,
    sortDir,
  });

  const uploadImages = async (files: FileList) => {
    setUploading(true);
    try {
      const { urls } = await api.upload("/api/admin/upload", files);
      setImagesInput((prev) =>
        [...prev.split("\n").filter(Boolean), ...urls].join("\n"),
      );
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Falha no upload");
    } finally {
      setUploading(false);
    }
  };

  const toggleSort = (col: ProductSortKey) => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortDir("asc");
    }
  };

  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectAll = () =>
    setSelected(
      selected.size === products.length
        ? new Set()
        : new Set(filtered.map((p) => p.id)),
    );

  const bulkActivate = async (active: boolean) => {
    await api.post("/api/admin/products/bulk", {
      ids: [...selected],
      action: active ? "activate" : "deactivate",
    });
    setSelected(new Set());
    load();
  };

  const bulkDelete = async () => {
    if (!confirm(`Excluir ${selected.size} Produtos(s)?`)) return;
    try {
      await api.post("/api/admin/products/bulk", {
        ids: [...selected],
        action: "delete",
      });
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao excluir");
    }
    setSelected(new Set());
    load();
  };

  const exportCSV = () => {
    const rows = [
      [
        "Nome",
        "Código",
        "Preço",
        "PIX",
        "Estoque",
        "Status",
        "Tamanhos",
        "Cores",
      ],
      ...filtered.map((p) => [
        p.name || "",
        p.code || "",
        p.base_price,
        p.pix_price ?? (p.base_price * 0.95).toFixed(2),
        p.stock,
        p.active ? "Ativo" : "Inativo",
        (p.sizes || []).join("/"),
        (p.colors || []).join("/"),
      ]),
    ];

    const blob = new Blob([`\ufeff${rows.map((r) => r.join(";")).join("\n")}`], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "produtos.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const openNew = () => {
    setEditing(emptyProduct());
    setImagesInput("");
    setSkus([]);
    setColorImages([]);
    setSelectedCategoryPaiId(null);
    setSelectedCategoryFilhoId(null);
  };

  const openEdit = async (p: AdminProduct) => {
    setEditing({ ...p });
    setDeletedSkuIds([]);
    setImagesInput((p.images || []).join("\n"));

    const { father, child } = p.category_id
      ? findAncestor(categoryRows, p.category_id)
      : { father: undefined, child: undefined };
    setSelectedCategoryPaiId(father?.id ?? null);
    setSelectedCategoryFilhoId(child?.id ?? null);

    const [skuRows, colorImageData] = await Promise.all([
      api.get<Record<string, any>[]>(`/api/admin/products/${p.id}/skus`),
      api.get<ColorImages[]>(`/api/admin/products/${p.id}/color-images`),
    ]);

    const colorNameById = new Map(productColors.map((c) => [c.id, c.name]));
    const mapped = skuRows.map((s) =>
      mapApiSku(s, s.colorId ? (colorNameById.get(s.colorId) ?? "") : ""),
    );
    mapped.sort((a, b) => {
      const pa = a.position ?? Number.MAX_SAFE_INTEGER;
      const pb = b.position ?? Number.MAX_SAFE_INTEGER;
      return pa - pb;
    });
    setSkus(mapped.map((s, i) => ({ ...s, position: s.position ?? i })));
    setColorImages(colorImageData);
  };

  const getSizes = () => editing?.sizes || [];

  const setSku = useCallback((index: number, patch: Partial<Sku>) => {
    setSkus((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }, []);

  const deleteSku = useCallback((index: number) => {
    setSkus((prev) => {
      const removed = prev[index];
      // Só variação já salva (com id) precisa ser apagada no banco; a nova só some da tela.
      if (removed?.id) {
        setDeletedSkuIds((ids) => (ids.includes(removed.id!) ? ids : [...ids, removed.id!]));
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const toggleSkuActive = useCallback((index: number) => {
    setSkus((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const next = [...prev];
      next[index] = { ...next[index], active: !next[index].active };
      return next;
    });
  }, []);

  const generateVariations = () => {
    if (!editing) return;
    const sizes = editing.sizes || [];
    const colors = editing.colors || [];
    setSkus((prev) => {
      const next = [...prev];
      let pos = next.reduce((m, s) => Math.max(m, s.position ?? -1), -1);
      for (const color of colors) {
        for (const size of sizes) {
          const exists = next.some(
            (s) => s.size === size && s.color === color,
          );
          if (!exists) {
            next.push({
              size,
              color,
              stock_qty: 0,
              price: null,
              sale_price: null,
              cost_price: null,
              reference: null,
              ean: null,
              min_stock: 0,
              sale_start: null,
              sale_end: null,
              active: true,
              availability: null,
              out_of_stock_action: null,
              weight_g: null,
              height_cm: null,
              width_cm: null,
              length_cm: null,
              position: ++pos,
            });
          }
        }
      }
      return next;
    });
  };

  const reorderSku = useCallback((index: number, dir: "up" | "down") => {
    setSkus((prev) => {
      const j = index + (dir === "up" ? -1 : 1);
      if (index < 0 || index >= prev.length || j < 0 || j >= prev.length)
        return prev;
      const next = [...prev];
      [next[index], next[j]] = [next[j], next[index]];
      return next.map((s, i) => ({ ...s, position: i }));
    });
  }, []);

  const bulkUpdateSkus = (
    patch: Partial<Sku>,
    filterFn?: (s: Sku) => boolean,
  ) => {
    setSkus((prev) =>
      prev.map((s) => (!filterFn || filterFn(s) ? { ...s, ...patch } : s)),
    );
  };

  const toggleSize = (size: string) => {
    if (!editing) return;
    const sizes = editing.sizes || [];
    setEditing({
      ...editing,
      sizes: sizes.includes(size)
        ? sizes.filter((s) => s !== size)
        : [...sizes, size],
    });
  };

  const toggleColor = (name: string) => {
    if (!editing) return;
    const colors = editing.colors || [];
    setEditing({
      ...editing,
      colors: colors.includes(name)
        ? colors.filter((c) => c !== name)
        : [...colors, name],
    });
  };

  const getColorImages = (color: string) =>
    colorImages.find((c) => c.color === color)?.images ?? [];

  const uploadColorImages = useCallback(
    async (color: string, files: FileList) => {
      setUploading(true);
      try {
        const { urls } = await api.upload("/api/admin/upload", files);
        setColorImages((prev) => {
          const idx = prev.findIndex((c) => c.color === color);
          if (idx > -1) {
            const next = [...prev];
            next[idx] = {
              ...next[idx],
              images: [...next[idx].images, ...urls],
            };
            return next;
          }
          return [...prev, { color, images: urls }];
        });
      } catch (err) {
        alert(err instanceof ApiError ? err.message : "Falha no upload");
      } finally {
        setUploading(false);
      }
    },
    [],
  );

  const removeColorImage = useCallback((color: string, url: string) => {
    setColorImages((prev) =>
      prev.map((c) =>
        c.color === color
          ? { ...c, images: c.images.filter((i) => i !== url) }
          : c,
      ),
    );
  }, []);

  const handleSave = async () => {
    if (!editing || !editing.name) return;
    setSaving(true);

    try {
      const payload = buildProductPayload(editing, imagesInput);

      // O que está na tela é o que salva. As listas `colors`/`sizes` do produto servem
      // para GERAR variações — não para descartar em silêncio o que o usuário editou.
      // Antes, um card cuja cor divergia da lista (ex.: variação "MARINHO" x produto
      // "Marinho") tinha imagem e campos jogados fora no save, sem erro nenhum.
      // Única exclusão: variação sem cor resolvida — o upsert usa product+size+color,
      // e com color nulo o ON CONFLICT não casa e duplicaria a linha a cada save.
      const skusToSave = skus.filter((s) => s.color);
      const savedColors = new Set(skusToSave.map((s) => s.color));

      const semCor = skus.length - skusToSave.length;
      if (semCor > 0) {
        alert(
          `${semCor} variação(ões) estão sem cor e NÃO serão salvas. Exclua pela lixeira do card e cadastre de novo com a cor certa.`,
        );
      }

      const body = {
        product: toApiProduct(payload),
        skus: skusToSave.map(toApiSku),
        colorImages: colorImages.filter(
          (c) => savedColors.has(c.color) || payload.colors.includes(c.color),
        ),
        deletedSkuIds,
      };

      if (editing.id) {
        await api.put(`/api/admin/products/${editing.id}/full`, body);
      } else {
        await api.post("/api/admin/products/full", body);
      }

      setEditing(null);
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao salvar produto");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este Produto?")) return;
    try {
      await api.delete(`/api/admin/products/${id}`);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao excluir");
    }
    load();
  };

  const toggleActive = async (p: AdminProduct) => {
    await api.patch(`/api/admin/products/${p.id}/active`, { active: !p.active });
    load();
  };

  return {
    products,
    categories,
    categoryTree,
    selectedCategoryPaiId,
    setSelectedCategoryPaiId,
    selectedCategoryFilhoId,
    setSelectedCategoryFilhoId,
    productColors,
    search,
    setSearch,
    editing,
    setEditing,
    loading,
    saving,
    imagesInput,
    setImagesInput,
    skus,
    uploading,
    filterCategory,
    setFilterCategory,
    filterStatus,
    setFilterStatus,
    viewMode,
    setViewMode,
    sortBy,
    sortDir,
    selected,
    setSelected,
    filtered,
    uploadImages,
    toggleSort,
    toggleSelect,
    selectAll,
    bulkActivate,
    bulkDelete,
    exportCSV,
    openNew,
    openEdit,
    getSizes,
    setSku,
    deleteSku,
    toggleSkuActive,
    generateVariations,
    reorderSku,
    bulkUpdateSkus,
    toggleSize,
    toggleColor,
    handleSave,
    handleDelete,
    toggleActive,
    getColorImages,
    uploadColorImages,
    removeColorImage,
  };
}
