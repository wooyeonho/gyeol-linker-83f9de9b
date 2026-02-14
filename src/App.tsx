import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

function HomePage() {
  return (
    <main className="relative w-full h-[100dvh] overflow-hidden bg-black flex flex-col items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/30 via-black to-black" />
      <div className="relative z-10 text-center space-y-6 px-4">
        <h1 className="text-4xl font-bold text-white tracking-tight">GYEOL</h1>
        <p className="text-white/60 text-lg max-w-md mx-auto">
          AI 디지털 동반자 — 대화할수록 성장하고 진화하는 나만의 AI
        </p>
        <div className="flex gap-4 justify-center mt-8">
          <Link
            to="/chat"
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            대화 시작
          </Link>
          <Link
            to="/settings"
            className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
          >
            설정
          </Link>
        </div>
      </div>
      <nav className="absolute bottom-8 flex gap-6 text-white/40 text-sm">
        <Link to="/activity" className="hover:text-white/70 transition-colors">활동</Link>
        <Link to="/social" className="hover:text-white/70 transition-colors">소셜</Link>
        <Link to="/market/skins" className="hover:text-white/70 transition-colors">마켓</Link>
      </nav>
    </main>
  );
}

function ChatPage() {
  return (
    <main className="relative w-full h-[100dvh] overflow-hidden bg-black flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <Link to="/" className="text-white/50 hover:text-white/80 text-sm">← 홈</Link>
        <span className="text-white/70 text-sm font-medium">GYEOL 채팅</span>
        <Link to="/settings" className="text-white/50 hover:text-white/80 text-sm">설정</Link>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-center text-white/30 text-sm py-8">
          채팅 기능은 Next.js 서버에서 동작합니다.
          <br />
          Vercel 배포 후 실제 채팅을 사용할 수 있어요.
        </div>
      </div>
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="메시지를 입력하세요..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 outline-none focus:border-indigo-500/50"
            disabled
          />
          <button
            className="px-4 py-3 bg-indigo-600/50 text-white/50 rounded-lg cursor-not-allowed"
            disabled
          >
            전송
          </button>
        </div>
      </div>
    </main>
  );
}

function SettingsPage() {
  return (
    <main className="w-full min-h-[100dvh] bg-black text-white p-6">
      <header className="flex items-center gap-4 mb-8">
        <Link to="/" className="text-white/50 hover:text-white/80 text-sm">← 홈</Link>
        <h1 className="text-xl font-bold">설정</h1>
      </header>
      <div className="space-y-6 max-w-lg">
        <section className="bg-white/5 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-medium text-white/70">GYEOL 엔진</h2>
          <div className="flex items-center justify-between">
            <span className="text-white/50 text-sm">기본 엔진 (Groq)</span>
            <span className="text-green-400 text-xs">활성</span>
          </div>
        </section>
        <section className="bg-white/5 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-medium text-white/70">BYOK (고급)</h2>
          <p className="text-white/40 text-xs">
            자신의 API 키를 등록하면 OpenAI, Anthropic, DeepSeek 등 선호하는 AI를 사용할 수 있어요.
          </p>
        </section>
        <section className="bg-white/5 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-medium text-white/70">자율 활동</h2>
          <p className="text-white/40 text-xs">
            GYEOL이 자동으로 학습하고 생각하는 활동 수준을 조절해요.
          </p>
        </section>
      </div>
    </main>
  );
}

function ActivityPage() {
  return (
    <main className="w-full min-h-[100dvh] bg-black text-white p-6">
      <header className="flex items-center gap-4 mb-8">
        <Link to="/" className="text-white/50 hover:text-white/80 text-sm">← 홈</Link>
        <h1 className="text-xl font-bold">활동</h1>
      </header>
      <div className="text-white/40 text-sm text-center py-12">
        아직 활동 기록이 없어요
      </div>
    </main>
  );
}

function SocialPage() {
  return (
    <main className="w-full min-h-[100dvh] bg-black text-white p-6">
      <header className="flex items-center gap-4 mb-8">
        <Link to="/" className="text-white/50 hover:text-white/80 text-sm">← 홈</Link>
        <h1 className="text-xl font-bold">소셜</h1>
      </header>
      <div className="text-white/40 text-sm text-center py-12">
        소셜 기능 준비 중
      </div>
    </main>
  );
}

function MarketPage() {
  return (
    <main className="w-full min-h-[100dvh] bg-black text-white p-6">
      <header className="flex items-center gap-4 mb-8">
        <Link to="/" className="text-white/50 hover:text-white/80 text-sm">← 홈</Link>
        <h1 className="text-xl font-bold">마켓</h1>
      </header>
      <div className="text-white/40 text-sm text-center py-12">
        스킨 & 스킬 마켓 준비 중
      </div>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/social" element={<SocialPage />} />
        <Route path="/market/*" element={<MarketPage />} />
      </Routes>
    </BrowserRouter>
  );
}
