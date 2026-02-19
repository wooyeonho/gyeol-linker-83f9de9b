import { Link } from 'react-router-dom';

export default function NotFound() {
  const isKo = typeof navigator !== 'undefined' && navigator.language.startsWith('ko');
  return (
    <main className="min-h-screen bg-background font-display flex flex-col items-center justify-center gap-4">
      <span className="material-icons-round text-5xl text-muted-foreground/20">explore_off</span>
      <h1 className="text-3xl font-bold text-foreground">404</h1>
      <p className="text-sm text-muted-foreground">
        {isKo ? '페이지를 찾을 수 없습니다.' : 'Page not found.'}
      </p>
      <Link to="/" className="text-primary hover:text-primary/80 text-xs font-medium">
        ← {isKo ? 'GYEOL로 돌아가기' : 'Back to GYEOL'}
      </Link>
    </main>
  );
}