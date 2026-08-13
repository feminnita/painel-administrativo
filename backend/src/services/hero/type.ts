export type HeroSlideInput = {
    type: 'image' | 'video';
    src: string;
    alt: string;
    poster: string;
    ctaText?: string;
    ctaHref?: string;
}