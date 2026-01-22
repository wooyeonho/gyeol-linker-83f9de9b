/**
 * 통화 포맷팅 유틸리티
 */

export type CurrencyFormatOptions = {
  locale?: string;
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

/**
 * 숫자를 통화 형식으로 포맷팅
 * @param amount 금액
 * @param options 포맷 옵션
 * @returns 포맷된 통화 문자열
 */
export function formatCurrency(
  amount: number,
  options: CurrencyFormatOptions = {}
): string {
  const {
    locale = 'ko',
    currency = 'KRW',
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
  } = options;

  const localeString = locale === 'ko' ? 'ko-KR' : 'en-US';

  return new Intl.NumberFormat(localeString, {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
}

/**
 * 숫자를 간단한 형식으로 포맷팅 (예: 1,000, 1.5K, 1.2M)
 * @param num 숫자
 * @param locale 로케일
 * @returns 포맷된 문자열
 */
export function formatNumber(num: number, locale: string = 'ko'): string {
  const localeString = locale === 'ko' ? 'ko-KR' : 'en-US';
  
  if (num >= 1000000) {
    return new Intl.NumberFormat(localeString, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(num);
  }
  
  return new Intl.NumberFormat(localeString).format(num);
}

/**
 * Commission rates for the platform
 */
export const COMMISSION_RATES = {
  PLATFORM: 0.20, // 20% platform fee
  SELLER: 0.80,   // 80% to seller
} as const;

/**
 * Format price to USD currency format
 * @param price Price in USD
 * @returns Formatted price string (e.g., "$29.99")
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Calculate earnings breakdown for a given price
 * @param price Total price in USD
 * @returns Object with total, platform fee, and seller earnings
 */
export function calculateEarnings(price: number): {
  total: number;
  platform: number;
  seller: number;
  formattedTotal: string;
  formattedPlatform: string;
  formattedSeller: string;
} {
  const platform = price * COMMISSION_RATES.PLATFORM;
  const seller = price * COMMISSION_RATES.SELLER;
  
  return {
    total: price,
    platform: Math.round(platform * 100) / 100,
    seller: Math.round(seller * 100) / 100,
    formattedTotal: formatPrice(price),
    formattedPlatform: formatPrice(platform),
    formattedSeller: formatPrice(seller),
  };
}




