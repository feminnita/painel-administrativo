import { useState } from "react";
import {
  useHomeBannersAdmin,
} from "../useBannersAdmin";
import { useSlidesAdmin } from "../useSlidesAdmin";
import { SlideForm } from "../ui/carrosel/SlideForm";
import { SlideListView } from "../ui/carrosel/SlideListView";
import { IntermediateHomeBannerSection } from "../ui/home/IntermediateBannerSection";
import { VideoSectionForm } from "../ui/home/VideoSectionForm";
import { ImageGridSection } from "../ui/home/ImageGridSeciton";
import { CategoryBannerSection } from "../ui/home/CategoryBannerSection";
import { Plus, RefreshCw, Save } from "lucide-react";

const TABS = [
  { key: "carousel", label: "Carrossel" },
  { key: "intermediate", label: "Banner Intermediário" },
  { key: "video", label: "Vídeo" },
  { key: "grid", label: "Grid de Imagens" },
  { key: "category", label: "Banners de categoria" },
] as const;

export function BannersPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("carousel");
  const slidesVm = useSlidesAdmin();
  const bannersVm = useHomeBannersAdmin();

  if (tab === "carousel" && slidesVm.editing !== null) {
    return <SlideForm vm={slidesVm} />;
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Banners da Home</h1>
          <p className="mt-1 text-gray-500">
            Gerencie todo o conteúdo visual da página inicial
          </p>
        </div>

        {tab === "carousel" ? (
          <button
            onClick={slidesVm.openNew}
            className="flex items-center gap-2 rounded-lg bg-[#8C2F39] px-5 py-3 font-semibold text-white hover:bg-[#7a2832]"
          >
            <Plus size={18} />
            Adicionar slide
          </button>
        ) : (
          <button
            onClick={bannersVm.handleSave}
            disabled={bannersVm.saving}
            className="flex items-center gap-2 rounded-lg bg-[#8C2F39] px-5 py-3 font-semibold text-white hover:bg-[#7a2832] disabled:opacity-50"
          >
            {bannersVm.saving ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {bannersVm.saving
              ? "Salvando..."
              : bannersVm.saved
                ? "Salvo!"
                : "Salvar"}
          </button>
        )}
      </div>

      <div className="mb-6 flex gap-2 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${tab === t.key
              ? "border-[#8C2F39] text-[#8C2F39]"
              : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "carousel" && <SlideListView vm={slidesVm} />}
      {tab === "intermediate" && (
        <IntermediateHomeBannerSection vm={bannersVm} />
      )}
      {tab === "video" && <VideoSectionForm vm={bannersVm} />}
      {tab === "grid" && <ImageGridSection vm={bannersVm} />}
      {tab === "category" && <CategoryBannerSection vm={bannersVm} />}
    </div>
  );
}