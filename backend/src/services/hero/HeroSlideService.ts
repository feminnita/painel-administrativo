import type { HeroSlideInput } from './type';
import * as HeroSlideRepository from '../../repository/hero/HeroSlideRepository';

const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

function validateVideoSrc(input: {
    type: string;
    src?: string;
}) {
    if (input.type === 'video' && (!input.src || !YOUTUBE_ID_REGEX.test(input.src))) {
        throw new Error('INVALID_VIDEO_ID');
    }
}

export function listSlides() {
    return HeroSlideRepository.findAll();
}

export function createSlide(input: HeroSlideInput) {
    validateVideoSrc(input);
    return HeroSlideRepository.insert(input);
}

export async function updateSlide(id: string, input: Partial<HeroSlideInput>) {
    if (input.type || input.src) {
        validateVideoSrc({
            type: input.type ?? 'image',
            src: input.src,
        })
    }
    const slide = await HeroSlideRepository.update(id, input);

    if (!slide) throw new Error('SLIDE_NOT_FOUND');

    return slide;
}

export async function deleteSlide(id: string) {
    const slide = await HeroSlideRepository.remove(id);

    if (!slide) throw new Error('SLIDE_NOT_FOUND');
    return slide;
}

export function reorderSlides(ids: string[]) {
    if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === 'string')) {
        throw new Error('INVALID_ORDER');
    }
    return HeroSlideRepository.reorder(ids);
}
