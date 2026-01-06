export { HotBadge } from './HotBadge';
export { BestRatedBadge } from './BestRatedBadge';
export { NewBadge } from './NewBadge';

// Badge display logic helpers
export function shouldShowHotBadge(purchaseCount: number): boolean {
  return purchaseCount >= 50;
}

export function shouldShowBestRatedBadge(rating: number, reviewCount: number = 0): boolean {
  return rating >= 4.5 && reviewCount >= 10;
}

export function shouldShowNewBadge(createdAt: string | Date): boolean {
  const created = new Date(createdAt);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 7;
}
