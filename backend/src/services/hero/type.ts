export type HeroSlideInput = {
    type: 'image' | 'video';
    src: string;
    srcMobile?: string | null;
    alt: string;
    poster: string;
    ctaText?: string;
    ctaHref?: string;
    title?: string | null;
    subtitle?: string | null;
    textPosition?: string | null;
    focal?: string | null;
}