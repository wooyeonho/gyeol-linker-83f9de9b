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
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setError(err.message || '문제가 발생했어요. 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-8"
      >
        <div className="text-center space-y-2">
          <motion.div
            className="w-16 h-16 mx-auto rounded-full bg-indigo-500/20 flex items-center justify-center"
            animate={{ boxShadow: ['0 0 20px rgba(79,70,229,0.2)', '0 0 40px rgba(79,70,229,0.4)', '0 0 20px rgba(79,70,229,0.2)'] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <span className="text-indigo-400 font-bold text-xl">G</span>
          </motion.div>
          <h1 className="text-2xl font-bold text-white">GYEOL</h1>
          <p className="text-sm text-white/40">AI Companion That Evolves With You</p>
        </div>

        <div className="flex gap-2 bg-white/5 rounded-xl p-1">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
              mode === 'login' ? 'bg-indigo-500/20 text-indigo-400' : 'text-white/40'
            }`}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition ${
              mode === 'signup' ? 'bg-indigo-500/20 text-indigo-400' : 'text-white/40'
            }`}
          >
            회원가입
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="이메일"
              required
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-white/30 text-sm outline-none focus:border-indigo-500/50 transition"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 (6자 이상)"
              required
              minLength={6}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-white/30 text-sm outline-none focus:border-indigo-500/50 transition"
            />
          </div>

          {error && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-2.5">
              {error}
            </motion.p>
          )}

          {success && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-sm text-green-400 bg-green-500/10 rounded-xl px-4 py-2.5">
              {success}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-indigo-500/20 text-indigo-400 font-medium text-sm hover:bg-indigo-500/30 disabled:opacity-40 transition"
          >
            {loading ? '처리 중...' : mode === 'login' ? '로그인' : '가입하기'}
          </button>
        </form>
      </motion.div>
    </main>
  );
}
