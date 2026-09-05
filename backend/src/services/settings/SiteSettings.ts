import * as SiteSettingsRepository from '../../repository/settings/SiteSettingsRepository';

export const ALLOWED_KEYS = [
    'home_intermediate_banner',
    'home_video_section',
    'home_image_grid',
    'home_category_banners',
    'home_sections',
    'home_section_categories',
    'shipping_config',
    'resale_term',
] as const;

export function listSettings() {
    return SiteSettingsRepository.findAll();
}

export function saveSetting(key: string, value: Record<string, unknown>) {
    if (!ALLOWED_KEYS.includes(key as never)) {
        throw new Error('UNKNOWN_SETTING_KEY');
    }
    // home_category_banners guarda um ARRAY de objetos; as demais chaves guardam
    // um objeto. Aceitamos os dois formatos de container JSON (nunca primitivo/null).
    if (typeof value !== 'object' || value === null) {
        throw new Error('INVALID_SETTING_VALUE');
    }
    return SiteSettingsRepository.upsert(key, value);
}
