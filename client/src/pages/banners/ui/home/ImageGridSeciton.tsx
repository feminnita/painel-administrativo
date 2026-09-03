import {
  MAX_GRID_IMAGES,
  type useHomeBannersAdmin,
} from "@/pages/banners/useBannersAdmin";
import { ChevronDown, ChevronUp, Plus, Trash2, Upload } from "lucide-react";

export function ImageGridSection({
  vm,
}: {
  vm: ReturnType<typeof useHomeBannersAdmin>;
}) {
  const {
    settings,
    uploading,
    addGridImage,
    moveGridImage,
    updateGridImage,
    removeGridImage,
    uploadGridImage,
  } = vm;

  return (
    <div className="max-w-3xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {settings.imageGrid.images?.map((img, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-100 p-4 shadow-sm"
          >
            {img.src && (
              <div className="mb-2 aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
                <img
                  src={img.src}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <label
              className={`mb-2 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed py-3 transition-colors ${
                uploading
                  ? "border-gray-200 bg-gray-50"
                  : "border-gray-300 hover:border-[#8C2F39] hover:bg-red-50/30"
              }`}
            >
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadGridImage(i, file);
                }}
              />
              <Upload size={16} className="text-gray-500" />
              <span className="text-sm text-gray-500">Enviar imagem</span>
            </label>
            <p className="mb-2 text-xs text-gray-400">3:4 · 1200×1600</p>

            <input
              type="text"
              value={img.title ?? ""}
              onChange={(e) => updateGridImage(i, { title: e.target.value })}
              className="mb-2 w-full rounded-lg border px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#8C2F39]"
              placeholder="Título (ex.: BLUSAS)"
            />

            <input
              type="text"
              value={img.href ?? ""}
              onChange={(e) => updateGridImage(i, { href: e.target.value })}
              className="mb-2 w-full rounded-lg border px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#8C2F39]"
              placeholder="Link (ex.: /categoria/blusas)"
            />

            <input
              type="text"
              value={img.alt}
              onChange={(e) => updateGridImage(i, { alt: e.target.value })}
              className="mb-2 w-full rounded-lg border px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#8C2F39]"
              placeholder="Texto alternativo"
            />

            <label className="mb-2 flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={img.active !== false}
                onChange={(e) => updateGridImage(i, { active: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-[#8C2F39] focus:ring-[#8C2F39]"
              />
              Ativo
            </label>

            <div className="flex items-center gap-2">
              <button
                onClick={() => moveGridImage(i, -1)}
                disabled={i === 0}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-600 hover:border-[#8C2F39] hover:text-[#8C2F39] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronUp size={14} />
              </button>
              <button
                onClick={() => moveGridImage(i, 1)}
                disabled={i === (settings.imageGrid.images?.length ?? 0) - 1}
                className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-sm text-gray-600 hover:border-[#8C2F39] hover:text-[#8C2F39] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronDown size={14} />
              </button>
              <button
                onClick={() => removeGridImage(i)}
                className="ml-auto flex items-center gap-1 text-sm text-red-500 hover:underline"
              >
                <Trash2 size={14} />
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addGridImage}
        disabled={(settings.imageGrid.images?.length ?? 0) >= MAX_GRID_IMAGES}
        className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-[#8C2F39] hover:text-[#8C2F39] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus size={16} />
        Adicionar imagem
      </button>

      <p className="text-xs text-gray-400">
        {(settings.imageGrid.images?.length ?? 0)}/{MAX_GRID_IMAGES} imagens
        (máximo de {MAX_GRID_IMAGES} blocos na faixa).
      </p>
    </div>
  );
}
