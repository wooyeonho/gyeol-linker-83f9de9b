/**
 * 스와이프 네비게이션 — 좌우 스와이프로 페이지 이동
 */
import { useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const ROUTES = ['/', '/gamification', '/social', '/activity', '/settings'];

export function useSwipeNavigation() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) < 80 || Math.abs(dy) > Math.abs(dx)) return; // too short or vertical

    const currentIdx = ROUTES.indexOf(pathname);
    if (currentIdx === -1) return;

    if (dx < 0 && currentIdx < ROUTES.length - 1) {
      navigate(ROUTES[currentIdx + 1]);
    } else if (dx > 0 && currentIdx > 0) {
      navigate(ROUTES[currentIdx - 1]);
    }
  }, [pathname, navigate]);

  return { onTouchStart, onTouchEnd };
}
