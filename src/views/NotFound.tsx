import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-white/60">페이지를 찾을 수 없습니다.</p>
      <Link to="/" className="text-indigo-400 hover:text-indigo-300 text-sm">← GYEOL로 돌아가기</Link>
    </main>
  );
}
