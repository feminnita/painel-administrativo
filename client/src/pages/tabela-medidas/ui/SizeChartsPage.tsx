import { useRef } from "react";
import { Ruler, Save, Upload, Trash2, Loader2 } from "lucide-react";
import { useSizeChartsAdmin } from "../useSizeChartsAdmin";
import { CHART_ORDER, type SizeChartType } from "../types";

function ChartCard({
    type,
    label,
    name,
    image,
    uploading,
    onUpload,
    onRemove,
}: {
    type: SizeChartType;
    label: string;
    name?: string;
    image?: string;
    uploading: boolean;
    onUpload: (file: File) => void;
    onRemove: () => void;
}) {
    const inputRef = useRef<HTMLInputElement>(null);

    return (
        <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700">{label}</p>
                {name && <p className="text-xs text-gray-400">{name}</p>}
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-40 w-40 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-200 bg-gray-50">
                    {image ? (
                        <img
                            src={image}
                            alt={`Como medir — ${label}`}
                            className="h-full w-full object-contain"
                        />
                    ) : (
                        <span className="px-2 text-center text-xs text-gray-400">
                            Sem imagem
                        </span>
                    )}
                </div>

                <div className="flex flex-col gap-2">
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) onUpload(file);
                            e.target.value = "";
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        {uploading ? (
                            <Loader2 size={15} className="animate-spin" />
                        ) : (
                            <Upload size={15} />
                        )}
                        {uploading ? "Enviando..." : image ? "Trocar imagem" : "Enviar imagem"}
                    </button>
                    {image && (
                        <button
                            type="button"
                            onClick={onRemove}
                            disabled={uploading}
                            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-[#8C2F39] hover:bg-red-50 disabled:opacity-50"
                        >
                            <Trash2 size={15} /> Remover
                        </button>
                    )}
                    <p className="text-xs text-gray-400">JPG, PNG ou WebP — até 4 MB.</p>
                </div>
            </div>
        </section>
    );
}

export function SizeChartsPage() {
    const {
        charts,
        loading,
        saving,
        saved,
        uploadingType,
        uploadImage,
        removeImage,
        handleSave,
    } = useSizeChartsAdmin();

    return (
        <div className="p-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="flex items-center gap-2 text-3xl font-bold text-gray-900">
                        <Ruler size={26} /> Tabela de Medidas
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Imagem "como medir" de cada tabela. Aparece acima da tabela no
                        modal da loja; os números são semeados no banco.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving || loading}
                    className="flex items-center gap-2 rounded-lg bg-[#8C2F39] px-6 py-2 text-sm font-semibold text-white hover:bg-[#7a2832] disabled:opacity-50"
                >
                    <Save size={15} />
                    {saving ? "Salvando..." : saved ? "Salvo ✓" : "Salvar"}
                </button>
            </div>

            {loading ? (
                <p className="text-sm text-gray-500">Carregando...</p>
            ) : (
                <div className="grid max-w-4xl gap-6 md:grid-cols-2">
                    {CHART_ORDER.map(({ type, label }) => (
                        <ChartCard
                            key={type}
                            type={type}
                            label={label}
                            name={charts[type]?.name}
                            image={charts[type]?.howToMeasureImage}
                            uploading={uploadingType === type}
                            onUpload={(file) => uploadImage(type, file)}
                            onRemove={() => removeImage(type)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
