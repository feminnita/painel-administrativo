import type { useHomeBannersAdmin } from "@/pages/banners/useBannersAdmin";
import { Upload } from "lucide-react";

export function IntermediateHomeBannerSection({
    vm,
}: {
    vm: ReturnType<typeof useHomeBannersAdmin>;
}) {
    const {
        settings,
        uploading,
        uploadIntermediateBanner,
        setIntermediateBanner,
    } = vm;

    const banner = settings.intermediateBanner;

    return (
        <div className="max-w-xl space-y-4">
            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Imagem do banner
                </label>

                {banner.src && (
                    <div className="mb-2 h-40 w-full overflow-hidden rounded-lg bg-gray-100">
                        <img
                            src={banner.src}
                            alt=""
                            className="h-full w-full object-cover"
                        />
                    </div>
                )}

                <label
                    className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed py-5 transition-colors ${uploading
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
                            if (file) uploadIntermediateBanner(file);
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
                    value={banner.src}
                    onChange={(e) => setIntermediateBanner({ src: e.target.value })}
                    className="w-full rounded-lg border px-4 py-2 text-sm focus:ring-2 focus:ring-[#8C2F39]"
                    placeholder="https://..."
                />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Título (sobre a imagem)
                </label>
                <input
                    type="text"
                    value={banner.title}
                    onChange={(e) => setIntermediateBanner({ title: e.target.value })}
                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-[#8C2F39]"
                    placeholder="BLUSAS FEMININAS"
                />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Subtítulo
                </label>
                <input
                    type="text"
                    value={banner.subtitle}
                    onChange={(e) => setIntermediateBanner({ subtitle: e.target.value })}
                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-[#8C2F39]"
                    placeholder="Atacado direto da fábrica · pedido mínimo R$ 199"
                />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Texto do botão
                </label>
                <input
                    type="text"
                    value={banner.ctaText}
                    onChange={(e) => setIntermediateBanner({ ctaText: e.target.value })}
                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-[#8C2F39]"
                    placeholder="VER BLUSAS →"
                />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Texto alternativo (acessibilidade)
                </label>
                <input
                    type="text"
                    value={banner.alt}
                    onChange={(e) => setIntermediateBanner({ alt: e.target.value })}
                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-[#8C2F39]"
                    placeholder="Descrição da imagem"
                />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Link ao clicar
                </label>
                <input
                    type="text"
                    value={banner.href}
                    onChange={(e) => setIntermediateBanner({ href: e.target.value })}
                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-[#8C2F39]"
                    placeholder="/categoria/blusas"
                />
                <p className="mt-1 text-xs text-gray-400">
                    Vazio = abre a categoria Blusas (/categoria/blusas)
                </p>
            </div>
        </div>
    );
}
