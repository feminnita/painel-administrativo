import * as SiteSettingsRepository from '../../repository/settings/SiteSettingsRepository';

export const ALLOWED_KEYS = [
    'home_intermediate_banner',
    'home_video_section',
    'home_image_grid',
    'shipping_config',
    'store_min_order',
] as const;

export function listSettings() {
    return SiteSettingsRepository.findAll();
}

export function saveSetting(key: string, value: Record<string, unknown>) {
    if (!ALLOWED_KEYS.includes(key as never)) {
        throw new Error('UNKNOWN_SETTING_KEY');
    }
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error('INVALID_SETTING_VALUE');
    }
    return SiteSettingsRepository.upsert(key, value);
}
