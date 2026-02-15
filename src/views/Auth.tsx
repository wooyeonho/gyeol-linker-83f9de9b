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
  const [showPassword, setShowPassword] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-display transition-colors duration-500 bg-[hsl(210,20%,98%)] dark:bg-[hsl(230,30%,6%)]">
      {/* Ambient background effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-3xl opacity-60 animate-pulse bg-[radial-gradient(circle,hsl(215,83%,58%,0.15),transparent_60%)] dark:bg-[radial-gradient(circle,hsl(215,83%,58%,0.1),transparent_60%)]" />
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl opacity-30 -translate-y-1/2 translate-x-1/2 bg-purple-100 dark:bg-indigo-900/20" />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl opacity-30 translate-y-1/2 -translate-x-1/2 bg-blue-100 dark:bg-blue-900/20" />
      </div>

      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md px-6 py-12 relative z-10 flex flex-col items-center"
      >
        {/* Glass Orb */}
        <div className="w-24 h-24 rounded-full mb-8 flex items-center justify-center relative cursor-pointer transition-transform hover:scale-105 glass-orb animate-float">
          <div className="absolute w-full h-full rounded-full opacity-60 bg-gradient-to-tr from-transparent via-white/30 to-transparent pointer-events-none" />
          <div className="grid grid-cols-3 gap-1 opacity-40 dark:opacity-60 mix-blend-overlay">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="w-1 h-1 bg-white rounded-full" />
            ))}
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-foreground mb-3 tracking-tight">GYEOL</h1>
        <p className="text-muted-foreground text-center mb-10 text-sm font-medium tracking-wide">
          AI Companion That Evolves With You
        </p>

        {/* Mode Tabs */}
        <div className="flex w-full mb-8 justify-between px-10">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
            className={`font-semibold pb-2 border-b-2 transition-colors ${
              mode === 'login'
                ? 'text-foreground border-primary'
                : 'text-muted-foreground border-transparent hover:text-foreground/70'
            }`}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
            className={`font-medium pb-2 border-b-2 transition-colors ${
              mode === 'signup'
                ? 'text-foreground border-primary'
                : 'text-muted-foreground border-transparent hover:text-foreground/70'
            }`}
          >
            회원가입
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-5">
          {/* Email */}
          <div className="group relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="material-icons-round text-muted-foreground group-focus-within:text-primary transition-colors">email</span>
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일 (Email)"
              required
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-white/5 border-0 ring-1 ring-border rounded-2xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-white/10 transition-all duration-300 shadow-sm dark:shadow-none outline-none"
            />
          </div>

          {/* Password */}
          <div className="group relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="material-icons-round text-muted-foreground group-focus-within:text-primary transition-colors">lock</span>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 (6자 이상)"
              required
              minLength={6}
              className="w-full pl-12 pr-12 py-4 bg-white dark:bg-white/5 border-0 ring-1 ring-border rounded-2xl text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-white/10 transition-all duration-300 shadow-sm dark:shadow-none outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="material-icons-round text-lg">
                {showPassword ? 'visibility' : 'visibility_off'}
              </span>
            </button>
          </div>

          {/* Error / Success */}
          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-sm text-destructive bg-destructive/10 rounded-2xl px-4 py-3">
              {error}
            </motion.p>
          )}
          {success && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-sm text-green-600 dark:text-green-400 bg-green-500/10 rounded-2xl px-4 py-3">
              {success}
            </motion.p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 mt-4 bg-primary hover:brightness-110 text-primary-foreground font-semibold rounded-2xl shadow-glow transform transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 flex items-center justify-center gap-2 group disabled:opacity-40"
          >
            <span>{loading ? '처리 중...' : mode === 'login' ? '로그인' : '가입하기'}</span>
            {!loading && (
              <span className="material-icons-round text-sm opacity-70 group-hover:translate-x-1 transition-transform">arrow_forward</span>
            )}
          </button>

          {/* Links */}
          <div className="flex items-center justify-center mt-6 gap-4 text-sm">
            <button type="button" className="text-muted-foreground hover:text-primary transition-colors">아이디 찾기</button>
            <span className="w-px h-3 bg-border" />
            <button type="button" className="text-muted-foreground hover:text-primary transition-colors">비밀번호 찾기</button>
          </div>
        </form>
      </motion.main>
    </div>
  );
}
