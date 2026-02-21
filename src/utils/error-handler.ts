import { showToast } from '@/src/components/Toast';

export function handleSupabaseError(error: { message?: string; code?: string } | null, context?: string): boolean {
  if (!error) return false;
  const msg = error.message || 'An unexpected error occurred';
  const prefix = context ? `${context}: ` : '';
  showToast({ type: 'warning', title: `${prefix}${msg}`, icon: 'error' });
  console.error(`[Supabase Error]${prefix ? ` ${prefix}` : ''}`, error);
  return true;
}

export function withErrorHandler<T>(
  promise: Promise<{ data: T | null; error: { message?: string } | null }>,
  context?: string
): Promise<T | null> {
  return promise.then(({ data, error }) => {
    if (error) {
      handleSupabaseError(error, context);
      return null;
    }
    return data;
  }).catch((err) => {
    handleSupabaseError({ message: err?.message || String(err) }, context);
    return null;
  });
}
