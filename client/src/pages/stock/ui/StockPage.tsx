import {
  AlertTriangle,
  Package,
  RefreshCw,
  Save,
  Search,
} from "lucide-react";
import { useStockAdmin } from "../useStockAdmin";

function StockBadge({ qty, reserved }: { qty: number; reserved: number }) {
  const avail = Math.max(0, qty - reserved);
  if (avail === 0)
    return (
      <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-600">
        Esgotado
      </span>
    );
  if (avail <= 3)
    return (
      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-600">
        Baixo ({avail})
      </span>
    );
  return (
    <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-600">
      {avail} disp.
    </span>
  );
}

export function StockPage() {
  const {
    products,
    selected,
    skus,
    dirtyIds,
    loading,
    loadingSkus,
    saving,
    search,
    setSearch,
    toast,
    selectProduct,
    loadSkus,
    updateQty,
    save,
  } = useStockAdmin();

  const filtered = products.filter(
    (p) => !search || p.name.toLowerCase().includes(search.toLowerCase()),
  );

  const totalAvail = skus.reduce(
    (s, k) => s + Math.max(0, k.stock_qty - k.reserved_qty),
    0,
  );
  const lowStock = skus.filter(
    (k) =>
      Math.max(0, k.stock_qty - k.reserved_qty) <= 3 &&
      Math.max(0, k.stock_qty - k.reserved_qty) > 0,
  );
  const outOfStock = skus.filter((k) => k.stock_qty - k.reserved_qty <= 0);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Estoque em Tempo Real</h1>
        <p className="mt-1 text-gray-500">
          Grade SKU por tamanho/cor com reservas automáticas
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Product list */}
        <div className="w-full shrink-0 lg:w-72">
          <div className="relative mb-3">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar produto..."
              className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#8C2F39]"
            />
          </div>
          <div className="max-h-[600px] overflow-hidden overflow-y-auto rounded-xl border bg-white">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#8C2F39] border-t-transparent" />
              </div>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectProduct(p)}
                  className={`w-full border-b px-4 py-3 text-left text-sm transition-colors last:border-0 hover:bg-gray-50 ${selected?.id === p.id ? "bg-[#FAF6F2]" : ""}`}
                >
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="text-xs text-gray-400">{p.category}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Stock editor */}
        <div className="flex-1">
          {!selected ? (
            <div className="flex h-64 items-center justify-center rounded-xl border bg-white text-gray-400">
              <div className="text-center">
                <Package size={40} className="mx-auto mb-2 text-gray-200" />
                <p>Selecione um produto para editar o estoque</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border bg-white p-6">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{selected.name}</h2>
                  <p className="text-sm text-gray-500">{selected.category}</p>
                </div>
                <div className="flex items-center gap-3">
                  {toast && (
                    <span className="text-xs font-medium text-green-600">
                      {toast}
                    </span>
                  )}
                  <button
                    onClick={() => loadSkus(selected.id)}
                    className="rounded-lg p-2 hover:bg-gray-100"
                  >
                    <RefreshCw size={15} />
                  </button>
                  <button
                    onClick={save}
                    disabled={saving || dirtyIds.size === 0}
                    className="flex items-center gap-1.5 rounded-lg bg-[#8C2F39] px-4 py-2 text-sm text-white hover:bg-[#7a2832] disabled:opacity-50"
                  >
                    <Save size={14} /> {saving ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </div>

              {/* Summary badges */}
              <div className="mb-6 flex flex-wrap gap-4">
                <div className="rounded-lg bg-gray-50 px-4 py-3 text-center">
                  <p className="text-xl font-bold text-green-600">
                    {totalAvail}
                  </p>
                  <p className="text-xs text-gray-500">Disponíveis</p>
                </div>
                {lowStock.length > 0 && (
                  <div className="rounded-lg bg-amber-50 px-4 py-3 text-center">
                    <p className="text-xl font-bold text-amber-600">
                      {lowStock.length}
                    </p>
                    <p className="text-xs text-gray-500">Variações baixas</p>
                  </div>
                )}
                {outOfStock.length > 0 && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3">
                    <AlertTriangle size={16} className="text-red-500" />
                    <div>
                      <p className="text-sm font-bold text-red-600">
                        {outOfStock.length} esgotado
                        {outOfStock.length !== 1 ? "s" : ""}
                      </p>
                      <p className="text-xs text-gray-500">
                        {outOfStock
                          .map((s) => `${s.size}${s.color ? `/${s.color}` : ""}`)
                          .join(", ")}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* SKU grid */}
              {loadingSkus ? (
                <div className="flex justify-center py-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#8C2F39] border-t-transparent" />
                </div>
              ) : skus.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">
                  Este produto não tem grade de SKUs — cadastre tamanhos e
                  cores no formulário do produto.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="pb-3 text-left font-medium text-gray-600">
                          Tamanho
                        </th>
                        <th className="pb-3 text-left font-medium text-gray-600">
                          Cor
                        </th>
                        <th className="pb-3 text-center font-medium text-gray-600">
                          Estoque total
                        </th>
                        <th className="pb-3 text-center font-medium text-gray-600">
                          Reservado
                        </th>
                        <th className="pb-3 text-center font-medium text-gray-600">
                          Disponível
                        </th>
                        <th className="pb-3 text-center font-medium text-gray-600">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {skus.map((sku) => (
                        <tr key={sku.id} className="hover:bg-gray-50">
                          <td className="py-3 font-semibold">{sku.size}</td>
                          <td className="py-3 text-gray-600">
                            {sku.color ?? "—"}
                          </td>
                          <td className="py-3 text-center">
                            <input
                              type="number"
                              min={0}
                              value={sku.stock_qty}
                              onChange={(e) =>
                                updateQty(
                                  sku.id,
                                  Number.parseInt(e.target.value) || 0,
                                )
                              }
                              className={`w-20 rounded-lg border px-2 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-[#8C2F39] ${
                                dirtyIds.has(sku.id) ? "border-[#8C2F39]" : ""
                              }`}
                            />
                          </td>
                          <td className="py-3 text-center text-gray-500">
                            {sku.reserved_qty}
                          </td>
                          <td className="py-3 text-center font-medium">
                            {Math.max(0, sku.stock_qty - sku.reserved_qty)}
                          </td>
                          <td className="py-3 text-center">
                            <StockBadge
                              qty={sku.stock_qty}
                              reserved={sku.reserved_qty}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
