import { lazy, Suspense } from 'react';

/**
 * Next.js dynamic() 대체 — Vite용 lazy loading wrapper
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function dynamic(importFn: () => Promise<{ default: any }>) {
  const LazyComponent = lazy(importFn);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function DynamicWrapper(props: any) {
    return (
      <Suspense fallback={null}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}
