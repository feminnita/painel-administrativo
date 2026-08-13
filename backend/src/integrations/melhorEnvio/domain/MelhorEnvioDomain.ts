import { PackageDimensions, PackableItem } from "../types";

const DEFAULTS = { weight: 0.3, height: 5, width: 15, length: 20 };

export function combinePackage(items: PackableItem[]): PackageDimensions {
    let weight = 0;
    let height = 0;
    let width = 0;
    let length = 0;


    for (const item of items) {
        weight += (Number(item.weightKg) || DEFAULTS.weight) * item.quantity;
        height = Math.max(height, Number(item.pkgHeightCm) || DEFAULTS.height);
        width = Math.max(width, Number(item.pkgWidthCm) || DEFAULTS.width);
        length = Math.max(length, Number(item.pkgLengthCm) || DEFAULTS.length);
    }

    return { weight, height, width, length }
}