export const DEFAULT_COMMISSION_RATE = 0.10;

export function calculateCommission(price: number, rate: number = DEFAULT_COMMISSION_RATE): { commission: number; sellerReceives: number } {
  const commission = Math.floor(price * rate);
  return { commission, sellerReceives: price - commission };
}

export function applyDiscount(
  price: number,
  discountType: 'percent' | 'fixed',
  discountValue: number,
  minPrice: number = 0
): number {
  if (price < minPrice) return price;
  if (discountType === 'percent') {
    return Math.max(0, Math.floor(price * (1 - discountValue / 100)));
  }
  return Math.max(0, price - discountValue);
}
