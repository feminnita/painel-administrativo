import { Upload } from "lucide-react";
import type { useHomeBannersAdmin } from "@/pages/banners/useBannersAdmin";

const SLOTS: {
    kind: "desktopUrl" | "mobileUrl";
    label: string;
    hint: string;
    aspect: string;
}[] = [
        {
            kind: "desktopUrl",
            label: "Vídeo desktop (1920×1080)",
            hint: "Exibido em telas maiores, formato paisagem 16:9",
            aspect: "aspect-video",
        },
        {
            kind: "mobileUrl",
            label: "Vídeo mobile (1080×1350)",
            hint: "Exibido no celular, formato retrato 4:5",
            aspect: "aspect-[4/5] max-w-[240px]",
        },
    ];

export function VideoSectionForm({
    vm,
}: {
    vm: ReturnType<typeof useHomeBannersAdmin>;
}) {
    const { settings, uploading, uploadVitrineVideo, clearVitrineVideo, setVitrineHref } = vm;
    const video = settings.videoSection;

    return (
        <div className="max-w-2xl space-y-6">
            <p className="text-sm text-gray-500">
                A vitrine toca automaticamente na home, sem som e sem marca do
                YouTube. Envie os dois formatos; a seção só aparece na loja com o
                vídeo desktop preenchido. MP4, WebM ou MOV · até 50 MB por arquivo.
            </p>

            {SLOTS.map(({ kind, label, hint, aspect }) => (
                <div key={kind} className="rounded-lg border border-gray-100 p-4">
                    <div className="mb-1 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-gray-700">{label}</p>
                        {video[kind] && (
                            <button
                                type="button"
                                onClick={() => clearVitrineVideo(kind)}
                                className="text-xs text-red-500 hover:underline"
                            >
                                Remover
                            </button>
                        )}
                    </div>
                    <p className="mb-3 text-xs text-gray-400">{hint}</p>

                    {video[kind] && (
                        <video
                            src={video[kind]}
                            controls
                            muted
                            preload="metadata"
                            className={`mb-3 w-full rounded-lg bg-gray-100 object-cover ${aspect}`}
                        />
                    )}

                    <label
                        className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed py-4 transition-colors ${uploading
                            ? "border-gray-200 bg-gray-50"
                            : "border-gray-300 hover:border-[#8C2F39] hover:bg-red-50/30"
                            }`}
                    >
                        <input
                            type="file"
                            accept="video/mp4,video/webm"
                            className="hidden"
                            disabled={uploading}
                            onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) uploadVitrineVideo(kind, file);
                                e.target.value = "";
                            }}
                        />
                        <Upload
                            size={16}
                            className={uploading ? "animate-pulse text-gray-400" : "text-gray-500"}
                        />
                        <span className="text-sm text-gray-500">
                            {uploading
                                ? "Enviando..."
                                : video[kind]
                                    ? "Trocar vídeo"
                                    : "Clique para enviar o vídeo"}
                        </span>
                    </label>
                    <p className="mt-1 text-xs text-gray-500">
                        MP4, WebM ou MOV · até 50 MB
                    </p>
                </div>
            ))}

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Link ao clicar (opcional)
                </label>
                <input
                    type="text"
                    value={video.href}
                    onChange={(e) => setVitrineHref(e.target.value)}
                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-[#8C2F39]"
                    placeholder="/produtos ou /categoria/lancamentos"
                />
                <p className="mt-1 text-xs text-gray-400">
                    Quem clicar no vídeo vai pra essa página. Deixe vazio pra vitrine
                    não ser clicável.
                </p>
            </div>
        </div>
    );
}
