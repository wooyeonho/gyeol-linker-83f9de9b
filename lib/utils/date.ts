/**
 * 날짜 포맷팅 유틸리티
 * 다국어 지원
 */

export type DateFormatOptions = {
  locale?: string;
  includeTime?: boolean;
  format?: 'short' | 'medium' | 'long' | 'full';
};

/**
 * 날짜를 로케일에 맞게 포맷팅
 * @param dateString ISO 날짜 문자열
 * @param options 포맷 옵션
 * @returns 포맷된 날짜 문자열
 */
export function formatDate(
  dateString: string,
  options: DateFormatOptions = {}
): string {
  const {
    locale = 'ko',
    includeTime = false,
    format = 'medium',
  } = options;

  const date = new Date(dateString);
  const localeString = locale === 'ko' ? 'ko-KR' : 'en-US';

  const formatOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: format === 'short' ? 'short' : format === 'long' ? 'long' : 'numeric',
    day: 'numeric',
  };

  if (includeTime) {
    formatOptions.hour = '2-digit';
    formatOptions.minute = '2-digit';
  }

  return date.toLocaleDateString(localeString, formatOptions);
}

/**
 * 상대 시간 포맷팅 (예: "2시간 전", "3일 전")
 * @param dateString ISO 날짜 문자열
 * @param locale 로케일
 * @returns 상대 시간 문자열
 */
export function formatRelativeTime(
  dateString: string,
  locale: string = 'ko'
): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return locale === 'ko' ? '방금 전' : 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return locale === 'ko'
      ? `${diffInMinutes}분 전`
      : `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return locale === 'ko'
      ? `${diffInHours}시간 전`
      : `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return locale === 'ko'
      ? `${diffInDays}일 전`
      : `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return locale === 'ko'
      ? `${diffInMonths}개월 전`
      : `${diffInMonths} month${diffInMonths > 1 ? 's' : ''} ago`;
  }

  const diffInYears = Math.floor(diffInMonths / 12);
  return locale === 'ko'
    ? `${diffInYears}년 전`
    : `${diffInYears} year${diffInYears > 1 ? 's' : ''} ago`;
}




