import 'dotenv/config';

function required(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Variavel de ambiente obrigatorio ausente: ${name}`);
    }
    return value;
}

export const env = {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 3334),
    corsOrigins: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:3001'],
    panelUrl: process.env.PANEL_URL ?? 'http://localhost:3001',

    databaseUrl: required('DATABASE_URL'),

    bling: {
        clientId: process.env.BLING_CLIENT_ID ?? '',
        clientSecret: process.env.BLING_CLIENT_SECRET ?? '',
        redirectUri: process.env.BLING_REDIRECT_URI ?? 'http://localhost:3334/api/admin/bling/oauth/callback',
    },

    melhorEnvio: {
        baseUrl: required('ME_BASE_URL'),
        token: required('ME_TOKEN'),
    },

    resend: {
        apiKey: required('RESEND_API_KEY'),
        mailFrom: required('MAIL_FROM'),
    },

    cloudinary: {
        cloudName: required('EXT_PUBLIC_CLOUDINARY_CLOUD_NAME'),
        apiKey: required('CLOUDINARY_API_KEY'),
        apiSecret: required('CLOUDINARY_API_SECRET'),
    },

    store: {
        cep: required('STORE_CEP'),
        name: required('FEMINNITA_NAME'),
        email: required('FEMINNITA_EMAIL'),
        phone: required('FEMINNITA_PHONE'),
        document: required('FEMINNITA_DOCUMENT'),
        address: required('FEMINNITA_ADDRESS'),
        number: required('FEMINNITA_NUMBER'),
        district: required('FEMINNITA_DISTRICT'),
        city: required('FEMINNITA_CITY'),
        state: required('FEMINNITA_STATE'),
    },
};

