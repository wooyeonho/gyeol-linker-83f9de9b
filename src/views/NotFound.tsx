import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background font-display flex flex-col items-center justify-center gap-4">
      <span className="material-icons-round text-6xl text-muted-foreground/30">explore_off</span>
      <h1 className="text-4xl font-bold text-foreground">404</h1>
      <p className="text-muted-foreground">페이지를 찾을 수 없습니다.</p>
      <Link to="/" className="text-primary hover:text-primary/80 text-sm font-medium">← GYEOL로 돌아가기</Link>
    </main>
  );
}
