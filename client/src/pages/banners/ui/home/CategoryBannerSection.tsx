import { useEffect, useState } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
import { api } from "@/lib/api/client";
import { mapApiCategory } from "@/pages/categories/mappers";
import type { CategoryRow } from "@/pages/categories/types";
import type { useHomeBannersAdmin } from "@/pages/banners/useBannersAdmin";

export function CategoryBannerSection({
  vm,
}: {
  vm: ReturnType<typeof useHomeBannersAdmin>;
}) {
  const {
    settings,
    uploading,
    addCategoryBanner,
    updateCategoryBanner,
    removeCategoryBanner,
    uploadCategoryBanner,
  } = vm;

  const [categories, setCategories] = useState<CategoryRow[]>([]);

  useEffect(() => {
    api
      .get<Record<string, any>[]>("/api/admin/categories")
      .then((rows) => setCategories(rows.map(mapApiCategory)))
      .catch((err) => console.error("Erro ao carregar categorias:", err));
  }, []);

  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-sm text-gray-500">
        Banner exibido no topo da página de cada categoria. Desktop 3:1 ·
        1920×640 e mobile 2:1 · 1080×540. JPG, PNG ou WebP · até 4 MB.
      </p>

      <div className="space-y-4">
        {settings.categoryBanners?.map((banner, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-100 p-4 shadow-sm"
          >
            <div className="mb-3">
              <label className="mb-1 block text-sm font-medium text-gray-600">
                Categoria
              </label>
              <select
                value={banner.categorySlug}
                onChange={(e) =>
                  updateCategoryBanner(i, { categorySlug: e.target.value })
                }
                className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-[#8C2F39]"
              >
                <option value="">Selecione uma categoria…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3 grid gap-4 sm:grid-cols-2">
              {(["desktopSrc", "mobileSrc"] as const).map((kind) => {
                const src = banner[kind];
                const label =
                  kind === "desktopSrc" ? "Imagem desktop" : "Imagem mobile";
                const dica =
                  kind === "desktopSrc" ? "3:1 · 1920×640" : "2:1 · 1080×540";
                const aspect =
                  kind === "desktopSrc" ? "aspect-[3/1]" : "aspect-[2/1]";
                return (
                  <div key={kind}>
                    <p className="mb-1 text-sm font-medium text-gray-600">
                      {label}
                    </p>
                    {src && (
                      <div
                        className={`mb-2 w-full overflow-hidden rounded-lg bg-gray-100 ${aspect}`}
                      >
                        <img
                          src={src}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <label
                      className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 transition-colors ${
                        uploading
                          ? "border-gray-200 bg-gray-50"
                          : "border-gray-300 hover:border-[#8C2F39] hover:bg-red-50/30"
                      }`}
                    >
                      <input
                        type="file"
                        accept="image/jpeg,image/webp"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) uploadCategoryBanner(i, kind, file);
                          e.target.value = "";
                        }}
                      />
                      <Upload size={16} className="text-gray-500" />
                      <span className="text-sm text-gray-500">
                        Enviar imagem
                      </span>
                    </label>
                    <p className="mt-1 text-xs text-gray-500">
                      {dica} · JPG, PNG ou WebP · até 4 MB
                    </p>
                  </div>
                );
              })}
            </div>

            <input
              type="text"
              value={banner.title}
              onChange={(e) => updateCategoryBanner(i, { title: e.target.value })}
              className="mb-2 w-full rounded-lg border px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#8C2F39]"
              placeholder="Título (ex.: OUTLET)"
            />

            <input
              type="text"
              value={banner.subtitle}
              onChange={(e) =>
                updateCategoryBanner(i, { subtitle: e.target.value })
              }
              className="mb-2 w-full rounded-lg border px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#8C2F39]"
              placeholder="Subtítulo (ex.: até 50% OFF)"
            />

            <input
              type="text"
              value={banner.href}
              onChange={(e) => updateCategoryBanner(i, { href: e.target.value })}
              className="mb-2 w-full rounded-lg border px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#8C2F39]"
              placeholder="Link (ex.: /categoria/outlet)"
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={banner.active !== false}
                  onChange={(e) =>
                    updateCategoryBanner(i, { active: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-[#8C2F39] focus:ring-[#8C2F39]"
                />
                Ativo
              </label>
              <button
                onClick={() => removeCategoryBanner(i)}
                className="flex items-center gap-1 text-sm text-red-500 hover:underline"
              >
                <Trash2 size={14} />
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addCategoryBanner}
        className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-[#8C2F39] hover:text-[#8C2F39]"
      >
        <Plus size={16} />
        Adicionar banner de categoria
      </button>
    </div>
  );
}
