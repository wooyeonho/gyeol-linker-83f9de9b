import { useState } from 'react';
import { Link } from 'react-router-dom';
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
        setSuccess('Verification email sent. Please check your inbox!');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) setError(error.message || 'Google sign-in failed.');
  };

  const handleForgotPassword = async () => {
    if (!email) { setError('Enter your email first'); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) setError(error.message);
    else setSuccess('Password reset email sent!');
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-display bg-background">
      {/* Aurora background */}
      <div className="aurora-bg" />

      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-sm px-6 py-12 relative z-10 flex flex-col items-center"
      >
        <div className="glass-panel rounded-2xl p-8 w-full">
          {/* Aurora ring logo */}
          <div className="mb-10 flex flex-col items-center">
            <div className="relative w-16 h-16 mb-6 flex items-center justify-center">
              <div className="absolute inset-0 aurora-ring rounded-full animate-spin-slow" />
              <div className="relative w-12 h-12 rounded-full bg-background flex items-center justify-center">
                <span className="material-icons-round text-2xl bg-gradient-to-br from-primary to-secondary bg-clip-text text-transparent">
                  all_inclusive
                </span>
              </div>
            </div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">GYEOL</h1>
            <p className="text-slate-500 text-[11px] tracking-[0.15em] uppercase mt-2">
              Grows with you.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex w-full mb-8 gap-1 bg-white/[0.03] rounded-xl p-1">
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); setSuccess(null); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  mode === m
                    ? 'bg-gradient-to-r from-primary to-[#8b5cf6] shadow-lg shadow-primary/25 text-white'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Google button */}
          <button type="button" onClick={handleGoogleLogin}
            className="w-full py-3.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-center gap-3 mb-6 transition">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
            </svg>
            <span className="text-sm text-foreground/70">Continue with Google</span>
          </button>

          <div className="flex items-center gap-3 w-full mb-6">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[10px] text-slate-500">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mb-1.5 block">Email Address</label>
              <div className="relative input-glow rounded-full border border-white/[0.06] bg-[#1f1d25] transition-all">
                <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">email</span>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                  className="w-full pl-12 pr-4 py-3.5 bg-transparent rounded-full text-foreground/90 placeholder:text-slate-600 outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mb-1.5 block">Password</label>
              <div className="relative input-glow rounded-full border border-white/[0.06] bg-[#1f1d25] transition-all">
                <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">lock</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters" required minLength={6}
                  className="w-full pl-12 pr-12 py-3.5 bg-transparent rounded-full text-foreground/90 placeholder:text-slate-600 outline-none text-sm"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  <span className="material-icons-round text-lg">{showPassword ? 'visibility' : 'visibility_off'}</span>
                </button>
              </div>
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
              className="w-full py-4 mt-2 btn-glow bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-full transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-30 text-sm">
              {loading ? 'Processing...' : mode === 'login' ? 'Enter GYEOL →' : 'Create Account →'}
            </button>
          </form>

          {/* Forgot password */}
          {mode === 'login' && (
            <button type="button" onClick={handleForgotPassword}
              className="mt-4 text-[11px] text-secondary hover:text-cyan-300 transition">
              Forgot password?
            </button>
          )}
        </div>

        {/* Legal links */}
        <div className="flex gap-4 mt-6">
          <Link to="/terms" className="text-xs text-slate-500 hover:text-slate-300 underline decoration-slate-600 underline-offset-2 transition">Terms</Link>
          <Link to="/privacy" className="text-xs text-slate-500 hover:text-slate-300 underline decoration-slate-600 underline-offset-2 transition">Privacy</Link>
        </div>
      </motion.main>
    </div>
  );
}
