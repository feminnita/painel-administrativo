import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import { apagarRascunho, lerRascunho, quandoFoi, salvarRascunho } from "@/lib/rascunho";
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

// Mesma chave usada pela grade (generate/colorSizes) para identificar uma
// combinação cor+tamanho.
const chaveVar = (color: string, size: string) =>
  `${norm(color)}__${norm(size)}`;

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
  // Combinações cor+tamanho que a LIXEIRA apagou nesta edição. Enquanto o
  // produto estiver aberto, nada que monta grade pode trazê-las de volta:
  // nem GERAR VARIAÇÕES, nem marcar uma cor, nem marcar um tamanho.
  //
  // Sem isto, apagar era só efeito visual: bastava mexer num chip de cor ou
  // tamanho para a variação reaparecer na tela e o save gravá-la de novo, em
  // branco (sem preço e sem referência). Diferente da trava antiga, esta NÃO
  // mexe na grade de tamanhos da cor e zera ao abrir outro produto — o "Gerar"
  // continua montando a grade completa em tudo que você não apagou.
  const [apagadasNaEdicao, setApagadasNaEdicao] = useState<Set<string>>(
    new Set(),
  );
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

  // ---------------------------------------------------------------------
  // Rascunho: o que está na tela fica gravado no navegador enquanto ela
  // digita. Sem isto, um "Salvar" que volta erro (ou uma aba fechada sem
  // querer) custa horas de trabalho num produto de muitas variações —
  // porque o formulário só existe na memória do React.
  //
  // `baseRef` guarda o estado de quando o produto abriu. Só grava rascunho
  // quando o que está na tela DIFERE disso — assim a pergunta "recuperar?"
  // só aparece quando existe mesmo alteração pendente.
  // ---------------------------------------------------------------------
  const baseRef = useRef<string | null>(null);

  const montarRascunho = () => ({
    editing,
    imagesInput,
    skus,
    colorSizes,
    colorImages,
    apagadas: [...apagadasNaEdicao],
    categoriaPaiId: selectedCategoryPaiId,
    categoriaFilhoId: selectedCategoryFilhoId,
  });
  type DadosRascunho = ReturnType<typeof montarRascunho>;

  const aplicarRascunho = (d: DadosRascunho) => {
    setEditing(d.editing);
    setImagesInput(d.imagesInput ?? "");
    setSkus(d.skus ?? []);
    setColorSizes(d.colorSizes ?? {});
    setColorImages(d.colorImages ?? []);
    setApagadasNaEdicao(new Set(d.apagadas ?? []));
    setSelectedCategoryPaiId(d.categoriaPaiId ?? null);
    setSelectedCategoryFilhoId(d.categoriaFilhoId ?? null);
  };

  /**
   * Chamado no fim de abrir um produto: fixa a base e, se houver rascunho
   * pendente daquele produto, pergunta se recupera.
   */
  const conferirRascunho = async (
    produtoId: string | undefined,
    base: DadosRascunho,
  ) => {
    baseRef.current = JSON.stringify(base);

    const guardado = lerRascunho<DadosRascunho>(produtoId);
    if (!guardado) return;
    if (JSON.stringify(guardado.dados) === baseRef.current) {
      apagarRascunho(produtoId);
      return;
    }

    const recuperar = await confirm({
      title: "Tem trabalho não salvo aqui",
      message:
        `Você mexeu neste produto ${quandoFoi(guardado.salvoEm)} e não chegou a salvar. ` +
        `Quer continuar de onde parou?`,
      confirmLabel: "Continuar de onde parei",
      cancelLabel: "Começar do que está salvo",
    });

    if (recuperar) aplicarRascunho(guardado.dados);
    else apagarRascunho(produtoId);
  };

  // Grava o rascunho enquanto ela trabalha. Espera 1s parada para não escrever
  // a cada tecla num produto com centenas de variações.
  useEffect(() => {
    if (editing === null || baseRef.current === null) return;
    const atual = montarRascunho();
    const texto = JSON.stringify(atual);
    if (texto === baseRef.current) {
      apagarRascunho(editing.id);
      return;
    }
    const id = setTimeout(() => salvarRascunho(editing.id, atual), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    editing,
    imagesInput,
    skus,
    colorSizes,
    colorImages,
    apagadasNaEdicao,
    selectedCategoryPaiId,
    selectedCategoryFilhoId,
  ]);

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
    // Zera a base ANTES de montar a tela: enquanto ela estiver nula o gravador
    // de rascunho fica parado. Sem isso ele compararia o produto que está
    // abrindo com a base do produto ANTERIOR e gravaria um rascunho de algo
    // que ninguém alterou.
    baseRef.current = null;

    const vazio = emptyProduct();
    setEditing(vazio);
    setImagesInput("");
    setSkus([]);
    setColorSizes({});
    setApagadasNaEdicao(new Set());
    setColorImages([]);
    setSelectedCategoryPaiId(null);
    setSelectedCategoryFilhoId(null);

    void conferirRascunho(undefined, {
      editing: vazio,
      imagesInput: "",
      skus: [],
      colorSizes: {},
      colorImages: [],
      apagadas: [],
      categoriaPaiId: null,
      categoriaFilhoId: null,
    });
  };

  const openEdit = async (p: AdminProduct) => {
    // Gravador parado até a tela terminar de carregar (ver openNew).
    baseRef.current = null;

    setEditing({ ...p });
    setApagadasNaEdicao(new Set());
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

    // A lista de cores do produto e as variações podem estar divergentes: variação
    // que veio do Bling entra com a cor dela sem passar pela lista. No 26700 eram
    // 5 cores na lista e 17 nas variações.
    //
    // Isso paralisa o formulário: marcar tamanho, gerar variações e o painel de
    // tamanho por cor trabalham TODOS em cima da lista, então as cores de fora
    // ficam intocáveis — a Chris clica para completar os tamanhos e não acontece
    // nada, sem nenhuma mensagem.
    //
    // A variação é a verdade: se existe variação naquela cor, a cor é do produto.
    // Reconcilia ao abrir, mantendo a ordem da lista e acrescentando as que faltam.
    const coresDaLista = p.colors || [];
    const listaCompleta = [...coresDaLista];
    for (const sku of loadedSkus) {
      if (sku.color && !listaCompleta.some((c) => norm(c) === norm(sku.color))) {
        listaCompleta.push(sku.color);
      }
    }
    if (listaCompleta.length > coresDaLista.length) {
      setEditing({ ...p, colors: listaCompleta });
    }

    // Abre SEM override de tamanho por cor: o "Gerar variações" precisa entregar a
    // GRADE COMPLETA (toda cor marcada × todo tamanho marcado), porque é no cadastro
    // que a Chris preenche o SKU de cada variação — faltar linha significa não ter
    // onde digitar a referência.
    //
    // Antes o override era semeado a partir dos SKUs já existentes, então uma cor
    // que estava no banco com 1 tamanho ficava presa nesse 1: gerar não completava
    // e só sobrava adicionar tamanho por tamanho no rodapé.
    //
    // A proteção contra recriar variação excluída continua, mas passa a valer
    // DENTRO da sessão de edição: excluiu e gerou de novo, não volta. Isso basta,
    // porque excluir esgotado nao e mais necessario — a loja ja esconde sozinha
    // tamanho sem estoque (visibleSizes) e o estoque vem do Bling.
    setColorSizes({});
    setColorImages(colorImageData);

    // Base fixada com o produto já reconciliado: é contra ISTO que o rascunho
    // é comparado, senão a reconciliação de cores contaria como alteração e a
    // pergunta apareceria em todo produto que tem variação vinda do Bling.
    void conferirRascunho(p.id, {
      editing:
        listaCompleta.length > coresDaLista.length
          ? { ...p, colors: listaCompleta }
          : { ...p },
      imagesInput: (p.images || []).join("\n"),
      skus: loadedSkus,
      colorSizes: {},
      colorImages: colorImageData,
      apagadas: [],
      categoriaPaiId: father?.id ?? null,
      categoriaFilhoId: child?.id ?? null,
    });
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

  // Gerar variações SÓ ACRESCENTA. Nunca tira nada da tela.
  //
  // Antes ele remontava a lista inteira a partir das cores marcadas, e toda
  // variação de cor fora dessa lista SUMIA da tela. No 26700 isso escondeu 19
  // variações de uma vez: a Chris tinha acabado de cadastrar, clicou em gerar,
  // viu tudo desaparecer e achou que havia perdido o trabalho (estava no banco).
  //
  // Uma tela que esconde o que existe é pior que uma que falta botão: leva a
  // pessoa a refazer o que ja estava feito, ou a salvar achando que apagou.
  /**
   * O que "Gerar variacoes" CRIARIA — sem criar nada. A tela pergunta antes.
   *
   * Existe porque a memoria do que foi apagado (apagadasNaEdicao) vive so
   * enquanto o produto esta ABERTO. Apagar hoje, reabrir amanha e clicar em
   * Gerar trazia tudo de volta em branco, sem aviso: no 24520 foram 23 linhas
   * sem referencia e sem bling_id, criadas em duas levas no mesmo dia.
   *
   * Memoria maior nao resolve — nao existe onde gravar "esta combinacao nao
   * deve existir", porque a grade e implicita (cor x tamanho). Entao o conserto
   * e parar de criar calado: quem confere e quem esta olhando a tela.
   */
  const previewVariations = (): Array<{ color: string; size: string }> => {
    if (!editing) return [];
    const cols = [...new Set(editing.colors || [])];
    const existing = new Set(skus.map((s) => `${norm(s.color)}__${norm(s.size)}`));
    const novas: Array<{ color: string; size: string }> = [];
    for (const color of cols)
      for (const size of [...new Set(getColorSizes(color))]) {
        const chave = chaveVar(color, size);
        if (!existing.has(chave) && !apagadasNaEdicao.has(chave)) {
          existing.add(chave);
          novas.push({ color, size });
        }
      }
    return novas;
  };

  const generateVariations = (): number => {
    if (!editing) return 0;
    const cols = [...new Set(editing.colors || [])];
    const existing = new Map(skus.map((s) => [`${norm(s.color)}__${norm(s.size)}`, s]));
    const faltando: Sku[] = [];
    // POR COR: itera os tamanhos daquela cor (override ou padrão), não a grade
    // cheia. Assim Rosa só ganha G/GG e não cria M pra apagar depois.
    for (const color of cols)
      for (const size of [...new Set(getColorSizes(color))]) {
        const chave = chaveVar(color, size);
        // Não ressuscita o que a lixeira apagou nesta edição.
        if (!existing.has(chave) && !apagadasNaEdicao.has(chave)) {
          existing.set(chave, null as unknown as Sku);
          faltando.push(newSku(color, size));
        }
      }
    if (faltando.length) setSkus((prev) => [...prev, ...faltando]);
    return skus.length + faltando.length;
  };

  const addVariation = async (color: string, size: string) => {
    if (!color || !size) return;

    // Adicionar de propósito TIRA a marca de apagada no servidor. Sem isto, uma
    // variação apagada um dia nunca mais poderia voltar: o save a recusaria
    // para sempre, o que seria pior que o problema que a marca resolve.
    if (editing?.id) {
      await api
        .post(`/api/admin/products/${editing.id}/skus/liberar`, { color, size })
        .catch(() => {
          /* se falhar, o save vai ignorar esta linha — melhor que gravar
             escondido o que a Chris mandou apagar. Ela vê e tenta de novo. */
        });
    }

    // Também tira da memória da sessão, senão a grade continua pulando ela.
    setApagadasNaEdicao((prev) => {
      const nova = new Set(prev);
      nova.delete(chaveVar(color, size));
      return nova;
    });

    setSkus((prev) =>
      prev.some((s) => s.color === color && s.size === size)
        ? prev
        : [...prev, newSku(color, size)],
    );
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
    // Memória do que VOCÊ mandou apagar. Vale enquanto o produto está aberto e
    // impede que gerar grade / marcar cor / marcar tamanho tragam de volta.
    setApagadasNaEdicao((prev) =>
      new Set(prev).add(chaveVar(sku.color, sku.size)),
    );

    setSkus((prev) => {
      const restantes = prev.filter(
        (s) => !(s.color === sku.color && s.size === sku.size),
      );
      // Cor que ficou sem nenhuma variação sai da lista do produto. Se ficasse
      // marcada, ao reabrir o produto ela geraria a grade dela de novo — e a
      // variação apagada voltava no dia seguinte, em branco.
      if (
        sku.color &&
        !restantes.some((s) => norm(s.color) === norm(sku.color))
      ) {
        setEditing((e) =>
          e
            ? {
                ...e,
                colors: (e.colors || []).filter(
                  (c) => norm(c) !== norm(sku.color),
                ),
              }
            : e,
        );
      }
      return restantes;
    });
    // A exclusão NÃO mexe mais na grade de tamanhos da cor. Ela mexia, para o
    // excluído não voltar — mas essa memória se acumulava durante a edição e
    // passava a limitar o "Gerar variações": com 10 cores × 3 tamanhos ele
    // devolvia 15 em vez de 30, e a Chris tinha que repor uma a uma.
    //
    // Agora só o painel "Tamanho por cor · ajustar" define grade por cor. Gerar
    // volta a significar exatamente o que o nome diz: montar a grade completa.
    // Se uma variação excluída reaparecer, é porque Gerar foi clicado de novo —
    // é só apagar de novo, e nada se perde no banco.
  };

  // Mesma regra da cor: marcar o tamanho já cria a variação dele em cada cor que
  // segue o padrão do produto. Cor com grade própria ("Tamanho por cor") não é
  // tocada — ali a Chris definiu à mão quais tamanhos aquela cor tem.
  const toggleSize = (size: string) => {
    if (!editing) return;
    const sizes = editing.sizes || [];
    const removendo = sizes.includes(size);

    setEditing({
      ...editing,
      sizes: removendo ? sizes.filter((s) => s !== size) : [...sizes, size],
    });

    setSkus((prev) => {
      if (removendo) {
        return prev.filter((s) => !(norm(s.size) === norm(size) && !s.id));
      }
      const semGradePropria = (editing.colors || []).filter((cor) => {
        const override = colorSizes[norm(cor)];
        return !(override !== undefined && override.length > 0);
      });
      const novos = semGradePropria
        .filter((cor) => !prev.some((s) => norm(s.color) === norm(cor) && norm(s.size) === norm(size)))
        // Marcar um tamanho não pode desfazer a lixeira.
        .filter((cor) => !apagadasNaEdicao.has(chaveVar(cor, size)))
        .map((cor) => newSku(cor, size));
      return novos.length ? [...prev, ...novos] : prev;
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

  // Marcar a cor JÁ CRIA as variações dela. Antes a cor entrava só na lista de
  // cima e a lista de Variações continuava igual: a Chris adicionava 4 cores,
  // não aparecia nada embaixo, e precisava clicar em "Gerar variações" ou repor
  // uma a uma pelo rodapé. Marcar a cor é dizer "este produto tem essa cor" —
  // as variações são a consequência óbvia disso.
  const toggleColor = (name: string) => {
    if (!editing) return;
    const colors = editing.colors || [];
    const removendo = colors.includes(name);

    setEditing({
      ...editing,
      colors: removendo ? colors.filter((c) => c !== name) : [...colors, name],
    });

    setSkus((prev) => {
      if (removendo) {
        // Desmarcar tira só o que ainda NÃO foi salvo. Variação já gravada some
        // apenas pela lixeira — ação explícita, com aviso de pedido.
        return prev.filter((s) => !(norm(s.color) === norm(name) && !s.id));
      }
      const tamanhos = [...new Set(getColorSizes(name))];
      const novos = tamanhos
        .filter((size) => !prev.some((s) => norm(s.color) === norm(name) && norm(s.size) === norm(size)))
        // Marcar uma cor não pode desfazer a lixeira.
        .filter((size) => !apagadasNaEdicao.has(chaveVar(name, size)))
        .map((size) => newSku(name, size));
      return novos.length ? [...prev, ...novos] : prev;
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

    // Promoção mais cara que o preço normal é sempre engano — quase sempre os
    // dois campos trocados. A loja simplesmente ignora essa "promoção", entao o
    // produto sumia do Outlet sem nenhum aviso.
    if (editing.sale_price != null && editing.sale_price >= editing.base_price) {
      alert(
        `O preço promocional (R$ ${editing.sale_price.toFixed(2).replace(".", ",")}) precisa ser MENOR ` +
          `que o preço de venda (R$ ${editing.base_price.toFixed(2).replace(".", ",")}). ` +
          `Confira se os dois não estão trocados.`,
      );
      return;
    }

    const payload = buildProductPayload(editing, imagesInput);
    // A foto por cor é da cor do SKU (a galeria/accordion vem dos SKUs), que pode
    // estar em caixa diferente de products.colors (ex.: SKU "ROSA" vs colors "Rosa").
    // Se filtrarmos só por editing.colors, a imagem das cores em caixa alta some no
    // save. Então o "ativo" inclui TODAS as cores com SKU + as da definição.
    //
    // Comparação por NORMALIZADO, não por string exata: incluir as cores do SKU
    // não bastava. A linha de foto podia estar gravada numa terceira grafia
    // ("LARANJA URSO" x "Laranja Urso") e caía fora do payload assim mesmo — e
    // até hoje o backend entendia payload vazio como "apague todas".
    const activeColors = new Set<string>(
      [
        ...payload.colors,
        ...skus.map((s) => s.color).filter((c): c is string => !!c),
      ].map(norm),
    );

    // A lista de cores NUNCA pode sair menor do que as cores que tem variacao.
    // Foi assim que 12 cores do 26700 viraram orfas: ficaram com variacao no
    // banco e fora da lista, e todo o formulario (marcar tamanho, gerar, tamanho
    // por cor) trabalha em cima da lista — entao elas ficavam intocaveis.
    for (const sku of skus) {
      if (sku.color && !payload.colors.some((c) => norm(c) === norm(sku.color))) {
        payload.colors = [...payload.colors, sku.color];
      }
    }

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
        colorImages: colorImages.filter((c) => activeColors.has(norm(c.color))),
      };

      if (editing.id) {
        await api.put(`/api/admin/products/${editing.id}/full`, body);
      } else {
        await api.post("/api/admin/products/full", body);
      }

      // Gravou no servidor: o rascunho cumpriu o papel e sai de cena. Só aqui —
      // num erro ele TEM que continuar, que é justamente quando ela precisa.
      apagarRascunho(editing.id);
      baseRef.current = null;

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
    previewVariations,
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
