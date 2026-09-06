import { useCallback, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import { buildTree, findAncestor, listGrandchildCategories } from "@/lib/categories";
import type { CategoryRow } from "@/lib/categories";
import { buildProductPayload, emptyProduct, filterAndSortProducts, sizeRank } from "./domain";
import { mapApiCategory, mapApiColor, mapApiProduct, toApiProduct } from "./mappers";
import { useConfirm } from "@/components/confirm/ConfirmProvider";
import type { AdminProduct, Color, ColorImages, ProductInput, ProductSortKey, Sku } from "./types";

// Normalização usada como CHAVE de cor em toda a grade (generate, colorSizes):
// minúsculo, sem acento, só [a-z0-9]. "Azul" casa com o legacy "AZUL".
const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");

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
  // Tamanho POR COR: override por cor (chave = cor normalizada) dos tamanhos que
  // EXISTEM naquela cor. Ausência da chave = usa o padrão do produto (editing.sizes).
  const [colorSizes, setColorSizes] = useState<Record<string, string[]>>({});
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
  const confirm = useConfirm();
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

  // Picker de categoria do produto: só categorias ATIVAS. As 3 marcadoras
  // (Lançamentos / Mais Vendidos / Outlet) estão inativas -> saem da árvore.
  const categoryTree = useMemo(
    () => buildTree(categoryRows.filter((r) => r.active)),
    [categoryRows],
  );
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

    if (!(await confirm({
      title: "Excluir produtos",
      message: `${selected.size} produto(s) serão excluídos permanentemente.`,
      confirmLabel: "Excluir todos",
      danger: true

    }))) return;
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
    setColorSizes({});
    setColorImages([]);
    setSelectedCategoryPaiId(null);
    setSelectedCategoryFilhoId(null);
  };

  const openEdit = async (p: AdminProduct) => {
    setEditing({ ...p });
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
    const loadedSkus: Sku[] = skuRows.map((s) => ({
      id: s.id,
      size: s.size,
      color: s.colorId ? (colorNameById.get(s.colorId) ?? "") : "",
      stock_qty: s.stockQty ?? 0,
      price: s.price == null ? null : Number(s.price),
      sale_price: s.salePrice == null ? null : Number(s.salePrice),
      sale_start: s.saleStart ?? null,
      sale_end: s.saleEnd ?? null,
      reference: s.reference ?? null,
      min_stock: s.minStock ?? 0,
      active: s.active ?? true,
      has_orders: s.hasOrders ?? false,
    }));
    setSkus(loadedSkus);
    // Inicializa o override de tamanho POR COR a partir dos SKUs carregados: para
    // cada cor (normalizada), os tamanhos DISTINTOS que já têm SKU. Reabrir o 29800
    // mostra Rosa só com G/GG (as cores que ela apagou não voltam).
    const cs: Record<string, string[]> = {};
    for (const s of loadedSkus) {
      if (!s.color) continue;
      const key = norm(s.color);
      if (!cs[key]) cs[key] = [];
      if (!cs[key].includes(s.size)) cs[key].push(s.size);
    }
    setColorSizes(cs);
    setColorImages(colorImageData);
  };

  const getSizes = () => editing?.sizes || [];

  const getSkuStock = (size: string, color: string) => {
    const found = skus.find((s) => s.size === size && s.color === color);
    return found?.stock_qty ?? 0;
  };

  const setSkuStock = (size: string, color: string, qty: number) => {
    setSkus((prev) => {
      const idx = prev.findIndex((s) => s.size === size && s.color === color);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], stock_qty: qty };
        return next;
      }
      return [
        ...prev,
        {
          size,
          color,
          stock_qty: qty,
          price: null,
          sale_price: null,
          sale_start: null,
          sale_end: null,
          reference: null,
          min_stock: 0,
          active: true,
        },
      ];
    });
  };

  // ── VARIAÇÕES (novo modelo: 1 variação = 1 SKU cor×tamanho) ──
  const newSku = (color: string, size: string): Sku => ({
    color,
    size,
    stock_qty: 0,
    price: editing?.base_price ?? null,
    sale_price: null,
    sale_start: null,
    sale_end: null,
    reference: null,
    min_stock: 0,
    active: true,
  });

  const getVariations = (): Sku[] =>
    [...skus].sort((a, b) =>
      a.color === b.color
        ? sizeRank(a.size) - sizeRank(b.size)
        : a.color.localeCompare(b.color, "pt-BR"),
    );

  const updateVariation = (sku: Sku, patch: Partial<Sku>) => {
    setSkus((prev) =>
      prev.map((s) =>
        s.color === sku.color && s.size === sku.size ? { ...s, ...patch } : s,
      ),
    );
  };

  // GERAR = monta a GRADE COMPLETA cores × tamanhos. Determinístico: o resultado
  // é SEMPRE exatamente (cores distintas) × (tamanhos distintos) — não depende do
  // que carregou. Antes o generate "adicionava só o que faltava" em cima do estado
  // atual; se os SKUs vinham parciais, a contagem saía imprevisível (ex.: 27 em vez
  // de 42) e travava o recadastro. Reaproveita o SKU existente por match CASE-
  // INSENSITIVE ("Azul" casa com o legacy "AZUL"), preservando id/preço/estoque e o
  // vínculo Bling; só CRIA os combos que ainda não existem. O save é ADITIVO no
  // backend, então SKUs fora da grade (ex.: cor com grafia divergente) não são
  // apagados — a Chris consolida no recadastro.
  // Tamanhos que EXISTEM naquela cor: o override (colorSizes) se DEFINIDO, senão o
  // padrão do produto (editing.sizes). Cor sem override herda o padrão.
  // Override VAZIO conta como "sem override" e volta a herdar o padrão. Sem isso,
  // uma cor que ficou com zero tamanhos — porque as variações dela foram todas
  // excluídas — travava em zero: o "Gerar variações" pulava essa cor, o chip
  // aparecia sem nenhuma variação embaixo, e só dava para repor tamanho por
  // tamanho pelo rodapé. A proteção contra recriar tamanho excluído continua
  // valendo enquanto sobrar ao menos um tamanho na cor.
  const getColorSizes = (color: string): string[] => {
    const override = colorSizes[norm(color)];
    return override !== undefined && override.length > 0
      ? override
      : editing?.sizes || [];
  };

  // Liga/desliga um tamanho SÓ naquela cor. Se ainda não há override, começa do
  // padrão do produto e vira override daquela cor a partir daí.
  const toggleColorSize = (color: string, size: string) => {
    const key = norm(color);
    setColorSizes((prev) => {
      const base = prev[key] !== undefined ? prev[key] : editing?.sizes || [];
      const next = base.includes(size)
        ? base.filter((s) => s !== size)
        : [...new Set([...base, size])];
      return { ...prev, [key]: next };
    });
  };

  const generateVariations = (): number => {
    if (!editing) return 0;
    const cols = [...new Set(editing.colors || [])];
    const existing = new Map(skus.map((s) => [`${norm(s.color)}__${norm(s.size)}`, s]));
    const grid: Sku[] = [];
    // POR COR: itera os tamanhos que existem NAQUELA cor (override ou padrão), não
    // a grade cheia. Assim Rosa só gera G/GG e não cria M pra apagar depois.
    for (const color of cols)
      for (const size of [...new Set(getColorSizes(color))]) {
        const found = existing.get(`${norm(color)}__${norm(size)}`);
        grid.push(found ?? newSku(color, size));
      }
    setSkus(grid);
    return grid.length;
  };

  const addVariation = (color: string, size: string) => {
    if (!color || !size) return;
    setSkus((prev) =>
      prev.some((s) => s.color === color && s.size === size)
        ? prev
        : [...prev, newSku(color, size)],
    );
    // Espelho da exclusão: a variação adicionada tem que ENTRAR na grade daquela
    // cor. Sem isso, o próximo "Gerar variações" reconstrói a grade sem ela e
    // apaga da tela a variação que o usuário acabou de adicionar.
    setColorSizes((prev) => {
      const key = norm(color);
      const base = prev[key] !== undefined ? prev[key] : editing?.sizes || [];
      return base.some((s) => norm(s) === norm(size))
        ? prev
        : { ...prev, [key]: [...base, size] };
    });
  };

  // Lixeira da variação: com pedido → desativa; sem pedido → apaga. Confirma antes.
  // skipConfirm: usado pela lixeira de COR (apaga todas as variações da cor), que
  // já confirmou UMA vez no nível da cor — não repete a confirmação por SKU.
  const deleteVariation = async (
    sku: Sku,
    opts?: { skipConfirm?: boolean },
  ) => {
    if (!opts?.skipConfirm) {
      const willDeactivate = Boolean(sku.id && sku.has_orders);
      const ok = await confirm(
        willDeactivate
          ? {
              title: "Desativar variação",
              message: `A variação ${sku.color} ${sku.size} já tem pedidos. Ela será DESATIVADA (sai da loja e para de vender), mas o histórico é mantido.`,
              confirmLabel: "Desativar",
              danger: true,
            }
          : {
              title: "Excluir variação",
              message: `A variação ${sku.color} ${sku.size} será excluída permanentemente.`,
              confirmLabel: "Excluir",
              danger: true,
            },
      );
      if (!ok) return;
    }

    if (sku.id && editing?.id) {
      try {
        const res = await api.delete<{ action: "deleted" | "deactivated" }>(
          `/api/admin/products/${editing.id}/skus/${sku.id}`,
        );
        if (res?.action === "deactivated") {
          setSkus((prev) =>
            prev.map((s) => (s.id === sku.id ? { ...s, active: false } : s)),
          );
          return;
        }
      } catch (err) {
        alert(err instanceof ApiError ? err.message : "Erro ao remover variação");
        return;
      }
    }
    setSkus((prev) =>
      prev.filter((s) => !(s.color === sku.color && s.size === sku.size)),
    );
    // O tamanho apagado tem que sair TAMBÉM da grade daquela cor. Sem isso o
    // combo continuava em colorSizes (ou herdado de editing.sizes) e o próximo
    // "Gerar variações" / adicionar variação RECRIAVA a variação recém-excluída
    // — só sumia de novo ao fechar e reabrir o produto, quando a grade volta a
    // ser derivada dos SKUs do banco.
    setColorSizes((prev) => {
      const key = norm(sku.color);
      const base = prev[key] !== undefined ? prev[key] : editing?.sizes || [];
      return { ...prev, [key]: base.filter((s) => norm(s) !== norm(sku.size)) };
    });
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

  // Cria (ou reaproveita) uma cor no mestre a partir do nome digitado no próprio
  // produto. O backend dedupa por normalizado e devolve a cor canônica; aqui só
  // fazemos o upsert na lista local (por id) e devolvemos a cor pra vincular.
  const createColor = async (
    name: string,
    force = false,
  ): Promise<Color | null> => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    try {
      const created = await api.post<Record<string, any>>("/api/admin/colors", {
        name: trimmed,
        force,
      });
      const color = mapApiColor(created);
      setProductColors((prev) =>
        prev.some((c) => c.id === color.id) ? prev : [...prev, color],
      );
      return color;
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Erro ao criar cor");
      return null;
    }
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

  const uploadColorImages = async (color: string, files: FileList) => {
    setUploading(true);
    try {
      const { urls } = await api.upload("/api/admin/upload", files);
      if (!urls.length) return;
      // ATÉ 5 fotos por cor (como as capas): o novo envio APPENDA às existentes,
      // mantendo a ordem. A 1ª é a capa da cor (miniatura de estampa + card dos
      // carrosséis de outro produto). product_color_images.images já é array.
      setColorImages((prev) => {
        const idx = prev.findIndex((c) => c.color === color);
        if (idx > -1) {
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            images: [...next[idx].images, ...urls].slice(0, 5),
          };
          return next;
        }
        return [...prev, { color, images: urls.slice(0, 5) }];
      });
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Falha no upload");
    } finally {
      setUploading(false);
    }
  };

  // Reordena as fotos de uma cor (drag). A posição 0 é a capa daquela cor.
  const reorderColorImages = (color: string, from: number, to: number) => {
    setColorImages((prev) =>
      prev.map((c) => {
        if (c.color !== color) return c;
        if (
          from === to ||
          from < 0 ||
          to < 0 ||
          from >= c.images.length ||
          to >= c.images.length
        )
          return c;
        const imgs = [...c.images];
        const [moved] = imgs.splice(from, 1);
        imgs.splice(to, 0, moved);
        return { ...c, images: imgs };
      }),
    );
  };

  // Zera SÓ as imagens do produto em edição: as fotos de capa (imagesInput) e
  // as fotos por cor (colorImages). NÃO toca em SKUs/variações, cores/tamanhos,
  // vínculo com o Bling nem exclui o produto — tudo isso persiste no próximo
  // salvar. A limpeza vira definitiva quando o usuário salvar.
  const clearAllImages = async () => {
    if (
      !(await confirm({
        title: "Remover todas as imagens",
        message:
          "Remover todas as imagens deste produto? As variações, o vínculo com o Bling e o produto continuam.",
        confirmLabel: "Remover todas",
        danger: true,
      }))
    )
      return;
    setImagesInput("");
    setColorImages([]);
  };

  const removeColorImage = (color: string, url: string) => {
    setColorImages((prev) =>
      prev.map((c) =>
        c.color === color
          ? { ...c, images: c.images.filter((i) => i !== url) }
          : c,
      ),
    );
  };

  const handleSave = async () => {
    if (!editing || !editing.name) return;
    // Preco de venda e obrigatorio (NOT NULL / > 0 no backend). Bloqueia aqui com
    // aviso claro em vez de mandar null/0 e tomar 500 (pg 23502).
    if (editing.base_price == null || !(editing.base_price > 0)) {
      alert("Informe o preço de venda (maior que zero).");
      return;
    }

    const payload = buildProductPayload(editing, imagesInput);
    // A foto por cor é da cor do SKU (a galeria/accordion vem dos SKUs), que pode
    // estar em caixa diferente de products.colors (ex.: SKU "ROSA" vs colors "Rosa").
    // Se filtrarmos só por editing.colors, a imagem das cores em caixa alta some no
    // save. Então o "ativo" inclui TODAS as cores com SKU + as da definição.
    const activeColors = new Set<string>([
      ...payload.colors,
      ...skus.map((s) => s.color).filter((c): c is string => !!c),
    ]);

    // O save é ADITIVO: manda TODOS os SKUs (existentes + gerados) — nunca deixa
    // um SKU "sair" do payload. Tirar cor/tamanho da definição NÃO apaga variação;
    // apagar é só pela lixeira da lista Variações (ação explícita, endpoint próprio).
    // Por isso não há mais confirmação de "remover N variações" no fluxo de salvar.

    setSaving(true);

    try {

      const body = {
        product: toApiProduct(payload),
        // stockQty NAO e enviado: estoque e read-only (fonte StockHub).
        skus: skus
          .map((s) => ({
            size: s.size,
            color: s.color || null,
            price: s.price,
            salePrice: s.sale_price,
            saleStart: s.sale_start,
            saleEnd: s.sale_end,
            reference: s.reference,
            minStock: s.min_stock,
            active: s.active,
          })),
        colorImages: colorImages.filter((c) => activeColors.has(c.color)),
      };

      if (editing.id) {
        await api.put(`/api/admin/products/${editing.id}/full`, body);
      } else {
        await api.post("/api/admin/products/full", body);
      }

      setEditing(null);
      load();
    } catch (err) {
      // Nunca engolir o erro do servidor: mostra STATUS + mensagem da API na tela.
      // Um 500 (exceção no backend) tem que aparecer como 500, não como texto genérico.
      console.error("Falha ao salvar produto:", err);
      if (err instanceof ApiError) {
        alert(`Erro ${err.status} ao salvar: ${err.message}`);
      } else {
        alert(`Falha ao salvar: ${err instanceof Error ? err.message : String(err)}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: "Excluir produto", message: "Este Produto será excluido permanentemente.", confirmLabel: "Excluir", danger: true }))) return;
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
    getSkuStock,
    setSkuStock,
    getVariations,
    updateVariation,
    generateVariations,
    colorSizes,
    getColorSizes,
    toggleColorSize,
    addVariation,
    deleteVariation,
    toggleSize,
    toggleColor,
    createColor,
    handleSave,
    handleDelete,
    toggleActive,
    getColorImages,
    uploadColorImages,
    reorderColorImages,
    removeColorImage,
    clearAllImages,
  };
}
