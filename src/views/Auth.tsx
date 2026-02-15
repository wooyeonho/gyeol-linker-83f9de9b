import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';
import { lovable } from '@/src/integrations/lovable/index';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signUpError) throw signUpError;
        setSuccess('확인 메일을 전송했어요. 메일함을 확인해 주세요!');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setError(err.message || '문제가 발생했어요.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) setError(error.message || 'Google 로그인에 실패했어요.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-display bg-black">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full blur-[120px] bg-primary/[0.04] ambient-glow" />
      </div>

      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-sm px-6 py-12 relative z-10 flex flex-col items-center"
      >
        <div className="mb-10 flex flex-col items-center">
          <div className="void-dot mb-6" />
          <h1 className="text-2xl font-semibold text-foreground/90 tracking-tight">GYEOL</h1>
          <p className="text-white/20 text-[10px] tracking-[0.2em] uppercase mt-2">
            AI Companion That Evolves With You
          </p>
        </div>

        <div className="flex w-full mb-8 gap-1 bg-white/[0.03] rounded-xl p-1">
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(null); setSuccess(null); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === m
                  ? 'bg-primary/80 text-white'
                  : 'text-white/25 hover:text-white/50'
              }`}
            >
              {m === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-3">
          <div className="relative">
            <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-white/15 text-lg">email</span>
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일" required
              className="w-full pl-12 pr-4 py-3.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-foreground/90 placeholder:text-white/20 focus:border-primary/30 transition-all outline-none text-sm"
            />
          </div>

          <div className="relative">
            <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-white/15 text-lg">lock</span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 (6자 이상)" required minLength={6}
              className="w-full pl-12 pr-12 py-3.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-foreground/90 placeholder:text-white/20 focus:border-primary/30 transition-all outline-none text-sm"
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40 transition-colors">
              <span className="material-icons-round text-lg">{showPassword ? 'visibility' : 'visibility_off'}</span>
            </button>
          </div>

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-xs text-destructive/80 bg-destructive/5 rounded-xl px-4 py-3">
              {error}
            </motion.p>
          )}
          {success && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-xs text-emerald-400/80 bg-emerald-500/5 rounded-xl px-4 py-3">
              {success}
            </motion.p>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3.5 mt-2 bg-primary/80 hover:bg-primary text-white font-medium rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-30 text-sm">
            {loading ? '처리 중...' : mode === 'login' ? '로그인' : '가입하기'}
          </button>
        </form>

        <div className="mt-10 w-full flex flex-col items-center">
          <p className="text-[10px] text-white/15 mb-4 uppercase tracking-[0.15em]">Or continue with</p>
          <button type="button" onClick={handleGoogleLogin}
            className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center text-white/40 hover:text-white/60 hover:bg-white/[0.06] transition-colors">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
            </svg>
          </button>
        </div>
      </motion.main>
    </div>
  );
}
