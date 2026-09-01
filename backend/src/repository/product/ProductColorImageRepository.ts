import { eq } from 'drizzle-orm';
import { db } from '../../config/db';
import { productColorImages, productsColors } from '../../config/db/schema';

export function findColorImagesWithNames(productId: string) {
    return db
        .select({ color: productsColors.name, images: productColorImages.images })
        .from(productColorImages)
        .innerJoin(productsColors, eq(productColorImages.colorId, productsColors.id))
        .where(eq(productColorImages.productId, productId));
}
