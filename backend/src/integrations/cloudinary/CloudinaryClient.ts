import { v2 as cloudinary } from 'cloudinary';

let configured = false;

function ensureConfigured() {
    if (configured) return;
    cloudinary.config({
        cloud_name: process.env.EXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    configured = true;
}

export function uploadImage(buffer: Buffer, folder: string): Promise<string> {
    ensureConfigured();
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder, resource_type: 'auto' },
            (error, result) => {
                if (error || !result) return reject(error ?? new Error('CLOUDINARY_UPLOAD_FAILED'));
                resolve(result.secure_url);
            },
        );
        stream.end(buffer);
    });
}
