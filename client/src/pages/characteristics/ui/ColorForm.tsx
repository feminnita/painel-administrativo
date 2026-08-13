
import type { useColorsAdmin } from "../useColorsAdmin";
import { Save, Upload, X } from "lucide-react";

export function ColorForm({ vm }: { vm: ReturnType<typeof useColorsAdmin> }) {
  const { editing, setEditing, saving, uploading, uploadImage, handleSave } =
    vm;

  if (!editing) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-7 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {editing.id ? "Editar" : "Nova"} Cor
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
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Imagem da cor (40x40) *
            </label>

            {editing.image_url && (
              <div className="mb-2 h-10 w-10 overflow-hidden rounded-full border">
                <img
                  src={editing.image_url}
                  alt=""
                  className="h-full w-full object-cover"
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
                  if (file) uploadImage(file);
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
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Nome da cor *
            </label>
            <input
              type="text"
              value={editing.name}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
              className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-[#8C2F39]"
              placeholder="Azul Nuvem"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={
                saving || uploading || !editing.name || !editing.image_url
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
