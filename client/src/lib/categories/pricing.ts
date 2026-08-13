export function calcPixPrice(
  basePrice: number,
  pixPrice?: number | null,
): number {
  if (pixPrice != null) return pixPrice;
  return Math.round(basePrice * 0.9 * 100) / 100;
}
