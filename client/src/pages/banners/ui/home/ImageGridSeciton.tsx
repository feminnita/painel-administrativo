import type { useHomeBannersAdmin } from "@/pages/banners/useBannersAdmin";
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
    updateGridImage,
    removeGridImage,
    moveGridImage,
    uploadGridImage,
  } = vm;

  const total = settings.imageGrid.images?.length ?? 0;

  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-xs text-gray-400">
        A faixa usa quantas imagens você adicionar (até 6 no desktop). Proporção
        recomendada: 1200×1600 (3:4).
      </p>
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
              <span className="text-sm text-gray-500">
                Enviar imagem · 1200×1600 (3:4)
              </span>
            </label>

            <input
              type="text"
              value={img.alt}
              onChange={(e) => updateGridImage(i, { alt: e.target.value })}
              className="mb-2 w-full rounded-lg border px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#8C2F39]"
              placeholder="Texto alternativo"
            />

            <div className="flex items-center gap-3">
              <button
                onClick={() => moveGridImage(i, -1)}
                disabled={i === 0}
                title="Mover para cima"
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#8C2F39] disabled:opacity-30"
              >
                <ChevronUp size={16} />
              </button>
              <button
                onClick={() => moveGridImage(i, 1)}
                disabled={i === total - 1}
                title="Mover para baixo"
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-[#8C2F39] disabled:opacity-30"
              >
                <ChevronDown size={16} />
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
        className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-600 hover:border-[#8C2F39] hover:text-[#8C2F39]"
      >
        <Plus size={16} />
        Adicionar imagem
      </button>
    </div>
  );
}
