import type { Slide, SlideInput, HomeBannersSettings } from "./types";

export function mapApiSlide(s: Record<string, any>): Slide {
  return {
    id: s.id,
    type: s.type,
    src: s.src,
    alt: s.alt ?? "",
    poster: s.poster ?? null,
    cta_text: s.ctaText ?? null,
    cta_href: s.ctaHref ?? null,
    order_index: s.orderIndex ?? 0,
    active: s.active ?? true,
    created_at: s.createdAt ?? "",
  };
}

export function toApiSlide(input: SlideInput) {
  return {
    type: input.type,
    src: input.src,
    alt: input.alt,
    poster: input.poster,
    ctaText: input.cta_text,
    ctaHref: input.cta_href,
    orderIndex: input.order_index,
    active: input.active,
  };
}

export function emptySlide(nextOrder: number): SlideInput {
  return {
    type: "image",
    src: "",
    alt: "",
    poster: null,
    cta_text: "",
    cta_href: "",
    order_index: nextOrder,
    active: true,
  };
}

export function buildSlidePayload(input: SlideInput): SlideInput {
  return {
    type: input.type,
    src: input.src,
    alt: input.alt || null,
    poster: input.poster || null,
    cta_text: input.cta_text || null,
    cta_href: input.cta_href || null,
    order_index: input.order_index,
    active: input.active,
  };
}

export function emptyHomeBanners(): HomeBannersSettings {
  return {
    intermediateBanner: {
      src: "",
      alt: "",
      href: "",
    },
    videoSection: {
      desktopUrl: "",
      mobileUrl: "",
      href: "",
    },
    imageGrid: {
      images: [],
    },
  };
}
