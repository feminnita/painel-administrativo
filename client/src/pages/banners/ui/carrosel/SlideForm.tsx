import type { useSlidesAdmin } from "@/pages/banners/useSlidesAdmin";
import { Image as ImageIcon, Save, Upload, Video, X } from "lucide-react";

export function SlideForm({ vm }: { vm: ReturnType<typeof useSlidesAdmin> }) {
  const {
    editing,
    setEditing,
    saving,
    uploading,
    uploadMedia,
    uploadMobile,
    uploadPoster,
    handleSave,
  } = vm;

  if (!editing) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-7 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {editing.id ? "Editar" : "Novo"} Slide
          </h2>
          <button
            onClick={() => setEditing(null)}
            className="text-gray-400 hover:text-gray-700"
          >
            <X size={22} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Tipo de mídia
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEditing({ ...editing, type: "image" })}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
                  editing.type === "image"
                    ? "border-[#8C2F39] bg-[#8C2F39] text-white"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <ImageIcon size={16} />
                Imagem
              </button>
              <button
                type="button"
                onClick={() => setEditing({ ...editing, type: "video" })}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 transition-colors ${
                  editing.type === "video"
                    ? "border-[#8C2F39] bg-[#8C2F39] text-white"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Video size={16} />
                Vídeo
              </button>
            </div>
          </div>

          {editing.type === "video" ? (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Vídeo do slide *
              </label>

              {editing.src && (
                <div className="mb-2 h-28 w-full overflow-hidden rounded-lg bg-gray-100">
                  <video
                    src={editing.src}
                    className="h-full w-full object-cover"
                    muted
                  />
                </div>
              )}

              <label
                className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed py-5 transition-colors ${
                  uploading
                    ? "border-gray-200 bg-gray-50"
                    : "border-gray-300 hover:border-[#8C2F39] hover:bg-red-50/30"
                }`}
              >
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadMedia(file);
                  }}
                />
                <Upload
                  size={18}
                  className={
                    uploading ? "animate-pulse text-gray-400" : "text-gray-500"
                  }
                />
                <span className="text-sm text-gray-500">
                  {uploading ? "Enviando..." : "Clique para enviar"}
                </span>
              </label>

              <div className="my-3 flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-400">ou cole a URL</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <input
                type="text"
                value={editing.src}
                onChange={(e) => setEditing({ ...editing, src: e.target.value })}
                className="w-full rounded-lg border px-4 py-2 text-sm focus:ring-2 focus:ring-[#8C2F39]"
                placeholder="ID do YouTube (11 caracteres)"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Imagem mobile (4:5, ex. 1080×1350) *
                </label>

                {editing.src_mobile && (
                  <div className="mb-2 h-28 w-full overflow-hidden rounded-lg bg-gray-100">
                    <img
                      src={editing.src_mobile}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}

                <label
                  className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed py-5 transition-colors ${
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
                      if (file) uploadMobile(file);
                    }}
                  />
                  <Upload
                    size={18}
                    className={
                      uploading ? "animate-pulse text-gray-400" : "text-gray-500"
                    }
                  />
                  <span className="text-sm text-gray-500">
                    {uploading ? "Enviando..." : "Clique para enviar (obrigatório)"}
                  </span>
                </label>

                <p className="mt-1.5 text-xs text-gray-400">
                  Mobile 1080×1350 (4:5) — obrigatório
                </p>

                <div className="my-3 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs text-gray-400">ou cole a URL</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                <input
                  type="text"
                  value={editing.src_mobile || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, src_mobile: e.target.value })
                  }
                  className="w-full rounded-lg border px-4 py-2 text-sm focus:ring-2 focus:ring-[#8C2F39]"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Imagem desktop (2,4:1, ex. 1920×800) — opcional
                </label>

                {editing.src && (
                  <div className="mb-2 h-28 w-full overflow-hidden rounded-lg bg-gray-100">
                    <img
                      src={editing.src}
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}

                <label
                  className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed py-5 transition-colors ${
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
                      if (file) uploadMedia(file);
                    }}
                  />
                  <Upload
                    size={18}
                    className={
                      uploading ? "animate-pulse text-gray-400" : "text-gray-500"
                    }
                  />
                  <span className="text-sm text-gray-500">
                    {uploading ? "Enviando..." : "Clique para enviar (opcional)"}
                  </span>
                </label>

                <p className="mt-1.5 text-xs text-gray-400">
                  Desktop 1920×800 (2,4:1) — opcional
                </p>

                <div className="my-3 flex items-center gap-3">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs text-gray-400">ou cole a URL</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                <input
                  type="text"
                  value={editing.src}
                  onChange={(e) =>
                    setEditing({ ...editing, src: e.target.value })
                  }
                  className="w-full rounded-lg border px-4 py-2 text-sm focus:ring-2 focus:ring-[#8C2F39]"
                  placeholder="https://..."
                />
              </div>
            </>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Texto alternativo (acessibilidade)
            </label>
            <input
              type="text"
              value={editing.alt || ""}
              onChange={(e) => setEditing({ ...editing, alt: e.target.value })}
              className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-[#8C2F39]"
              placeholder="Descrição da imagem"
            />
          </div>

          {editing.type === "video" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Capa do vídeo (poster)
              </label>

              {editing.poster && (
                <div className="mb-2 h-20 w-full overflow-hidden rounded-lg bg-gray-100">
                  <img
                    src={editing.poster}
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
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadPoster(file);
                  }}
                />
                <Upload size={16} className="text-gray-500" />
                <span className="text-sm text-gray-500">
                  Clique para enviar a capa
                </span>
              </label>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Texto do botão
              </label>
              <input
                type="text"
                value={editing.cta_text || ""}
                onChange={(e) =>
                  setEditing({ ...editing, cta_text: e.target.value })
                }
                className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-[#8C2F39]"
                placeholder="VER COLEÇÃO"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Link do botão
              </label>
              <input
                type="text"
                value={editing.cta_href || ""}
                onChange={(e) =>
                  setEditing({ ...editing, cta_href: e.target.value })
                }
                className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-[#8C2F39]"
                placeholder="/produtos"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Título
            </label>
            <input
              type="text"
              value={editing.title || ""}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-[#8C2F39]"
              placeholder="Título grande sobre o banner"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Subtítulo
            </label>
            <input
              type="text"
              value={editing.subtitle || ""}
              onChange={(e) =>
                setEditing({ ...editing, subtitle: e.target.value })
              }
              className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-[#8C2F39]"
              placeholder="Texto de apoio (opcional)"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Posição do texto
              </label>
              <select
                value={editing.text_position || "center-center"}
                onChange={(e) =>
                  setEditing({ ...editing, text_position: e.target.value })
                }
                className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-[#8C2F39]"
              >
                <option value="top-left">Topo · Esquerda</option>
                <option value="top-center">Topo · Centro</option>
                <option value="top-right">Topo · Direita</option>
                <option value="center-left">Meio · Esquerda</option>
                <option value="center-center">Meio · Centro</option>
                <option value="center-right">Meio · Direita</option>
                <option value="bottom-left">Base · Esquerda</option>
                <option value="bottom-center">Base · Centro</option>
                <option value="bottom-right">Base · Direita</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Cor do texto
              </label>
              <select
                value={editing.text_theme || "light"}
                onChange={(e) =>
                  setEditing({ ...editing, text_theme: e.target.value })
                }
                className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-[#8C2F39]"
              >
                <option value="light">Claro — texto branco (fundo escurece)</option>
                <option value="dark">Escuro — texto preto (fundo clareia)</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Ponto focal
              </label>
              <select
                value={editing.focal || "center"}
                onChange={(e) =>
                  setEditing({ ...editing, focal: e.target.value })
                }
                className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-[#8C2F39]"
              >
                <option value="center">Centro</option>
                <option value="center top">Topo</option>
                <option value="center bottom">Base</option>
                <option value="left">Esquerda</option>
                <option value="right">Direita</option>
                <option value="left top">Topo · Esquerda</option>
                <option value="right top">Topo · Direita</option>
                <option value="left bottom">Base · Esquerda</option>
                <option value="right bottom">Base · Direita</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Ordem
              </label>
              <input
                type="number"
                min="0"
                value={editing.order_index}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    order_index: Number.parseInt(e.target.value) || 0,
                  })
                }
                className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-[#8C2F39]"
              />
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(e) =>
                    setEditing({ ...editing, active: e.target.checked })
                  }
                  className="h-4 w-4 accent-[#8C2F39]"
                />
                <span className="text-sm font-medium text-gray-700">
                  Slide ativo
                </span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={
                saving ||
                uploading ||
                (editing.type === "video" ? !editing.src : !editing.src_mobile)
              }
              className="flex items-center gap-2 rounded-lg bg-[#8C2F39] px-6 py-2 font-semibold text-white hover:bg-[#7a2832] disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "Salvando..." : "Salvar"}
            </button>
            <button
              onClick={() => setEditing(null)}
              className="rounded-lg border px-5 py-2 text-sm hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
