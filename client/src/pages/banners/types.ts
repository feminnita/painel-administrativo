export type Slide = {
  id: string;
  type: "image" | "video";
  src: string;
  alt: string;
  poster: string | null;
  cta_text: string | null;
  cta_href: string | null;
  order_index: number;
  active: boolean;
  created_at: string;
};

export type SlideInput = {
  type: "image" | "video";
  src: string;
  alt: string | null;
  poster: string | null;
  cta_text: string | null;
  cta_href: string | null;
  order_index: number;
  active: boolean;
};

export type IntermediateBannerInput = {
  src: string;
  alt: string;
  href: string;
};

export type VideoSectionInput = {
  title: string;
  videoId: string;
};

export type ImageGridItemInput = {
  src: string;
  alt: string;
};

export type ImageGridInput = {
  images: ImageGridItemInput[];
};

export type HomeBannersSettings = {
  intermediateBanner: IntermediateBannerInput;
  videoSection: VideoSectionInput;
  imageGrid: ImageGridInput;
};
