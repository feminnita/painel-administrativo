import type { Slide, SlideInput, HomeBannersSettings } from "./types";

export function mapApiSlide(s: Record<string, any>): Slide {
  return {
    id: s.id,
    type: s.type,
    src: s.src,
    src_mobile: s.srcMobile ?? null,
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
    srcMobile: input.src_mobile,
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
    src_mobile: "",
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
    src: input.src || "",
    src_mobile: input.src_mobile || null,
    // alt e src são NOT NULL no banco: manda "" (nunca null) para não quebrar o insert.
    alt: input.alt?.trim() || "",
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
