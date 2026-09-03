import type { useSlidesAdmin } from "@/pages/banners/useSlidesAdmin";
import {
  ChevronDown,
  ChevronUp,
  Edit,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Plus,
  Trash2,
  Video,
} from "lucide-react";

export function SlideListView({
  vm,
}: {
  vm: ReturnType<typeof useSlidesAdmin>;
}) {
  const {
    slides,
    loading,
    openEdit,
    handleDelete,
    toggleActive,
    move,
    openNew,
  } = vm;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#8C2F39] border-t-transparent" />
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="rounded-xl border border-gray-100 bg-white p-16 text-center text-gray-400 shadow-sm">
        <ImageIcon size={56} className="mx-auto mb-4" />
        <p className="text-lg font-medium">Nenhum slide cadastrado</p>
        <p className="mt-1 text-sm">
          Adicione slides ao carrossel da página inicial
        </p>
        <button
          onClick={openNew}
          className="mx-auto mt-6 flex items-center gap-2 rounded-lg bg-[#8C2F39] px-5 py-3 font-semibold text-white hover:bg-[#7a2832]"
        >
          <Plus size={18} />
          Adicionar slide
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`flex items-center gap-4 rounded-xl border bg-white p-4 shadow-sm ${
            slide.active ? "border-gray-100" : "border-gray-200 opacity-60"
          }`}
        >
          <div className="flex shrink-0 flex-col">
            <button
              onClick={() => move(index, -1)}
              disabled={index === 0}
              className="rounded p-0.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
              title="Mover para cima"
            >
              <ChevronUp size={16} />
            </button>
            <button
              onClick={() => move(index, 1)}
              disabled={index === slides.length - 1}
              className="rounded p-0.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30"
              title="Mover para baixo"
            >
              <ChevronDown size={16} />
            </button>
          </div>

          <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100">
            {slide.type === "image" && (slide.src || slide.src_mobile) ? (
              <img
                src={slide.src || slide.src_mobile || ""}
                alt={slide.alt || ""}
                className="h-full w-full object-cover"
              />
            ) : slide.type === "video" ? (
              <div className="flex h-full w-full items-center justify-center bg-gray-800">
                <Video size={20} className="text-white" />
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageIcon size={20} className="text-gray-300" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  slide.type === "video"
                    ? "bg-purple-100 text-purple-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                {slide.type === "video" ? (
                  <Video size={11} />
                ) : (
                  <ImageIcon size={11} />
                )}
                {slide.type === "video" ? "Vídeo" : "Imagem"}
              </span>
              <span className="text-xs text-gray-400">
                Posição: {slide.order_index}
              </span>
            </div>
            <p className="truncate text-sm font-medium text-gray-900">
              {slide.alt || slide.src}
            </p>
            {slide.cta_text && (
              <p className="mt-0.5 text-xs text-gray-500">
                Botão: {slide.cta_text} → {slide.cta_href}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => toggleActive(slide)}
              className="rounded-lg p-2 hover:bg-gray-100"
              title={slide.active ? "Desativar slide" : "Ativar slide"}
            >
              {slide.active ? (
                <Eye size={16} className="text-green-600" />
              ) : (
                <EyeOff size={16} className="text-gray-400" />
              )}
            </button>
            <button
              onClick={() => openEdit(slide)}
              className="rounded-lg p-2 hover:bg-gray-100"
            >
              <Edit size={16} className="text-gray-600" />
            </button>
            <button
              onClick={() => handleDelete(slide.id)}
              className="rounded-lg p-2 hover:bg-red-50"
            >
              <Trash2 size={16} className="text-red-500" />
            </button>
          </div>
        </div>
      ))}

      <button
        onClick={openNew}
        className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#8C2F39] py-4 font-semibold text-[#8C2F39] transition-colors hover:bg-red-50/40"
      >
        <Plus size={18} />
        Adicionar slide
      </button>
    </div>
  );
}
