import type { useHomeBannersAdmin } from "@/pages/banners/useBannersAdmin";

export function VideoSectionForm({
    vm,
}: {
    vm: ReturnType<typeof useHomeBannersAdmin>;
}) {
    const { settings, setVideoTitle, setVideoUrl } = vm;
    const video = settings.videoSection;

    return (
        <div className="max-w-xl space-y-4">
            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Título da seção
                </label>
                <input
                    type="text"
                    value={video.title}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-[#8C2F39]"
                    placeholder="nossa essência"
                />
            </div>

            <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                    Link do vídeo no YouTube
                </label>
                <input
                    type="text"
                    value={video.videoId}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    className="w-full rounded-lg border px-4 py-2 focus:ring-2 focus:ring-[#8C2F39]"
                    placeholder="https://www.youtube.com/watch?v=..."
                />
                <p className="mt-1 text-xs text-gray-400">
                    Cole a URL completa do YouTube — o ID do vídeo é extraído
                    automaticamente.
                </p>
            </div>

            {video.videoId && (
                <div className="aspect-video max-w-md overflow-hidden rounded-lg bg-gray-800">
                    <iframe
                        width="100%"
                        height="100%"
                        src={`https://www.youtube.com/embed/${video.videoId}`}
                        title="Preview"
                        frameBorder="0"
                        allowFullScreen
                    />
                </div>
            )}
        </div>
    );
}
