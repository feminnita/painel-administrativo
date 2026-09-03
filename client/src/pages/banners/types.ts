export type Slide = {
  id: string;
  type: "image" | "video";
  src: string;
  src_mobile: string | null;
  alt: string;
  poster: string | null;
  cta_text: string | null;
  cta_href: string | null;
  title: string | null;
  subtitle: string | null;
  text_position: string;
  text_theme: string;
  text_position_mobile: string;
  text_theme_mobile: string;
  focal: string;
  order_index: number;
  active: boolean;
  created_at: string;
};

export type SlideInput = {
  type: "image" | "video";
  src: string;
  src_mobile: string | null;
  alt: string | null;
  poster: string | null;
  cta_text: string | null;
  cta_href: string | null;
  title: string | null;
  subtitle: string | null;
  text_position: string;
  text_theme: string;
  text_position_mobile: string;
  text_theme_mobile: string;
  focal: string;
  order_index: number;
  active: boolean;
};

export type IntermediateBannerInput = {
  src: string;
  alt: string;
  href: string;
};

export type VideoSectionInput = {
  desktopUrl: string;
  mobileUrl: string;
  href: string;
};

export type ImageGridItemInput = {
  src: string;
  alt: string;
  title?: string;
  href?: string;
  order?: number;
  active?: boolean;
};

export type ImageGridInput = {
  images: ImageGridItemInput[];
};

export type CategoryBannerInput = {
  categorySlug: string;
  desktopSrc: string;
  mobileSrc: string;
  title: string;
  subtitle: string;
  href: string;
  active: boolean;
};

export type HomeBannersSettings = {
  intermediateBanner: IntermediateBannerInput;
  videoSection: VideoSectionInput;
  imageGrid: ImageGridInput;
  categoryBanners: CategoryBannerInput[];
};
