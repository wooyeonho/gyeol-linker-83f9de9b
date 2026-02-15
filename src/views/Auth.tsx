import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signUpError) throw signUpError;
        setSuccess('확인 메일을 전송했어요. 메일함을 확인해 주세요!');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setError(err.message || '문제가 발생했어요. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex font-display">
      {/* Left Panel — Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12 bg-background">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[400px] space-y-8"
        >
          {/* Logo */}
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="material-icons-round text-primary-foreground text-xl">blur_on</span>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {mode === 'login' ? '로그인' : '회원가입'}
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일을 입력하세요"
                required
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 (6자 이상)"
                required
                minLength={6}
                className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition"
              />
            </div>

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-sm text-destructive bg-destructive/10 rounded-lg px-4 py-2.5">
                {error}
              </motion.p>
            )}
            {success && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-sm text-green-600 dark:text-green-400 bg-green-500/10 rounded-lg px-4 py-2.5">
                {success}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-foreground text-background font-medium text-sm hover:opacity-90 disabled:opacity-40 transition"
            >
              {loading ? '처리 중...' : mode === 'login' ? '로그인' : '가입하기'}
            </button>
          </form>

          {/* Toggle */}
          <p className="text-sm text-center text-muted-foreground">
            {mode === 'login' ? (
              <>아직 계정이 없으신가요?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
                  className="text-primary font-medium hover:underline"
                >회원가입</button>
              </>
            ) : (
              <>이미 계정이 있으신가요?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
                  className="text-primary font-medium hover:underline"
                >로그인</button>
              </>
            )}
          </p>
        </motion.div>
      </div>

      {/* Right Panel — Visual */}
      <div className="hidden lg:flex w-1/2 relative overflow-hidden rounded-l-3xl">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(40,50%,92%)] via-[hsl(300,40%,85%)] to-[hsl(215,83%,70%)]" />

        {/* Pearl spheres */}
        <div className="absolute top-1/4 left-1/3 w-48 h-48 pearl-sphere rounded-full sphere-1 opacity-40" />
        <div className="absolute bottom-1/3 right-1/4 w-32 h-32 pearl-sphere rounded-full sphere-2 opacity-30" />
        <div className="absolute top-1/2 right-1/3 w-20 h-20 pearl-sphere rounded-full sphere-3 opacity-25" />

        {/* Floating card */}
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[80%] max-w-sm">
          <div className="glass-panel rounded-2xl px-5 py-3.5 flex items-center gap-3 shadow-glass">
            <span className="text-sm text-muted-foreground flex-1">GYEOL에게 무엇이든 물어보세요</span>
            <div className="w-8 h-8 rounded-full bg-foreground/80 flex items-center justify-center">
              <span className="material-icons-round text-background text-base">arrow_upward</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
