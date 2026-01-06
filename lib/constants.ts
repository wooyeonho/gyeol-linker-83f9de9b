/**
 * Business Constants for Prompt Jeongeom Marketplace
 * 
 * This file contains all business-related constants used throughout the application.
 * Centralizing these values ensures consistency and makes updates easier.
 */

// ============================================
// COMMISSION & PRICING
// ============================================

/**
 * Platform commission rate (20%)
 * The platform takes 20% of each sale as a fee
 */
export const PLATFORM_COMMISSION_RATE = 0.20;

/**
 * Seller earnings rate (80%)
 * Sellers receive 80% of each sale
 */
export const SELLER_EARNINGS_RATE = 0.80;

/**
 * Minimum price for a prompt (USD)
 */
export const MIN_PROMPT_PRICE = 0.99;

/**
 * Maximum price for a prompt (USD)
 */
export const MAX_PROMPT_PRICE = 999.99;

/**
 * Default currency
 */
export const DEFAULT_CURRENCY = 'USD';

/**
 * Currency locale for formatting
 */
export const CURRENCY_LOCALE = 'en-US';

// ============================================
// AI MODELS
// ============================================

/**
 * Supported AI models for prompts
 */
export const AI_MODELS = [
  { id: 'chatgpt', name: 'ChatGPT', icon: '🤖' },
  { id: 'claude', name: 'Claude', icon: '🧠' },
  { id: 'midjourney', name: 'Midjourney', icon: '🎨' },
  { id: 'stable-diffusion', name: 'Stable Diffusion', icon: '🖼️' },
  { id: 'dall-e', name: 'DALL-E', icon: '🎭' },
  { id: 'sora', name: 'Sora', icon: '🎬' },
  { id: 'gemini', name: 'Gemini', icon: '✨' },
] as const;

export type AIModelId = typeof AI_MODELS[number]['id'];

// ============================================
// CATEGORIES
// ============================================

/**
 * Prompt categories with translations
 */
export const CATEGORIES = [
  { id: 'marketing', name_en: 'Marketing', name_ko: '마케팅' },
  { id: 'design', name_en: 'Design', name_ko: '디자인' },
  { id: 'writing', name_en: 'Writing', name_ko: '글쓰기' },
  { id: 'productivity', name_en: 'Productivity', name_ko: '생산성' },
  { id: 'education', name_en: 'Education', name_ko: '교육' },
  { id: 'development', name_en: 'Development', name_ko: '개발' },
  { id: 'business', name_en: 'Business', name_ko: '비즈니스' },
  { id: 'creative', name_en: 'Creative', name_ko: '창작' },
] as const;

export type CategoryId = typeof CATEGORIES[number]['id'];

// ============================================
// PROMPT STATUS
// ============================================

/**
 * Prompt approval status
 */
export const PROMPT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type PromptStatus = typeof PROMPT_STATUS[keyof typeof PROMPT_STATUS];

// ============================================
// USER ROLES
// ============================================

/**
 * User roles in the system
 */
export const USER_ROLES = {
  USER: 'user',
  SELLER: 'seller',
  ADMIN: 'admin',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// ============================================
// ORDER STATUS
// ============================================

/**
 * Order status
 */
export const ORDER_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

// ============================================
// PAYOUT STATUS
// ============================================

/**
 * Payout status for seller withdrawals
 */
export const PAYOUT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export type PayoutStatus = typeof PAYOUT_STATUS[keyof typeof PAYOUT_STATUS];

// ============================================
// PAGINATION
// ============================================

/**
 * Default items per page
 */
export const DEFAULT_PAGE_SIZE = 12;

/**
 * Maximum items per page
 */
export const MAX_PAGE_SIZE = 50;

// ============================================
// VALIDATION
// ============================================

/**
 * Minimum title length
 */
export const MIN_TITLE_LENGTH = 10;

/**
 * Maximum title length
 */
export const MAX_TITLE_LENGTH = 100;

/**
 * Minimum description length
 */
export const MIN_DESCRIPTION_LENGTH = 50;

/**
 * Maximum description length
 */
export const MAX_DESCRIPTION_LENGTH = 1000;

/**
 * Minimum prompt content length
 */
export const MIN_CONTENT_LENGTH = 100;

/**
 * Maximum prompt content length
 */
export const MAX_CONTENT_LENGTH = 10000;

/**
 * Maximum tags per prompt
 */
export const MAX_TAGS = 10;

/**
 * Maximum tag length
 */
export const MAX_TAG_LENGTH = 30;

// ============================================
// RATING
// ============================================

/**
 * Minimum rating value
 */
export const MIN_RATING = 1;

/**
 * Maximum rating value
 */
export const MAX_RATING = 5;

// ============================================
// DESIGN SYSTEM (Stitch)
// ============================================

/**
 * Stitch Design System colors
 */
export const STITCH_COLORS = {
  PRIMARY: '#00A86B', // Jade Green
  BACKGROUND: '#000000',
  TEXT_PRIMARY: '#FFFFFF',
  TEXT_SECONDARY: '#A0A0A0',
  SURFACE_1: '#0A0A0A', // Gray-900
  SURFACE_2: '#1A1A1A', // Gray-800
  BORDER: '#2A2A2A', // Gray-700
} as const;

/**
 * Border radius values
 */
export const BORDER_RADIUS = {
  MAIN: '32px', // Cards, buttons, modals
  NESTED: '24px', // Nested elements, images
  SMALL: '16px', // Tags, badges
  FULL: '9999px', // Pills, avatars
} as const;

// ============================================
// LOCALIZATION
// ============================================

/**
 * Supported locales
 */
export const SUPPORTED_LOCALES = ['ko', 'en'] as const;

/**
 * Default locale
 */
export const DEFAULT_LOCALE = 'ko';

export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

// ============================================
// EXTERNAL LINKS
// ============================================

/**
 * Social media and external links
 */
export const EXTERNAL_LINKS = {
  TWITTER: 'https://twitter.com/promptjeongeom',
  GITHUB: 'https://github.com/wooyeonho/prompt-jeongeum',
  DISCORD: 'https://discord.gg/promptjeongeom',
} as const;

// ============================================
// APP METADATA
// ============================================

/**
 * Application name
 */
export const APP_NAME = 'Prompt Jeongeom';

/**
 * Application tagline
 */
export const APP_TAGLINE = {
  en: 'Premium AI Prompts Marketplace',
  ko: '프리미엄 AI 프롬프트 마켓플레이스',
};

/**
 * Application description
 */
export const APP_DESCRIPTION = {
  en: 'Discover and sell premium AI prompts for ChatGPT, Claude, Midjourney, and more.',
  ko: 'ChatGPT, Claude, Midjourney 등을 위한 프리미엄 AI 프롬프트를 발견하고 판매하세요.',
};
