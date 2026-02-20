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
  const [rememberMe, setRememberMe] = useState(false);

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
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) setError(error.message);
    else setSuccess('Password reset email sent!');
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-display bg-background">
      <div className="aurora-bg" aria-hidden="true" />

      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-sm px-6 py-12 relative z-10 flex flex-col items-center"
        role="main" aria-label="Authentication"
      >
        <div className="glass-panel rounded-2xl p-8 w-full">
          {/* Aurora ring logo — dark glow ring */}
          <div className="mb-10 flex flex-col items-center">
            <div className="relative w-20 h-20 mb-6 flex items-center justify-center">
              {/* Outer glow */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-secondary/20 blur-xl" />
              {/* Aurora spinning ring */}
              <div className="absolute inset-0 aurora-ring rounded-full animate-spin-slow" />
              {/* Inner dark circle with icon */}
              <div className="relative w-14 h-14 rounded-full bg-[#0d0b14] border border-white/[0.06] flex items-center justify-center shadow-[0_0_30px_rgba(120,78,218,0.3)]">
                <span className="material-icons-round text-2xl bg-gradient-to-br from-primary to-secondary bg-clip-text text-transparent">
                  all_inclusive
                </span>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">GYEOL</h1>
            <p className="text-muted-foreground text-[11px] tracking-[0.15em] uppercase mt-2">
              Grows with you.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex w-full mb-8 gap-1 bg-white/[0.03] rounded-xl p-1" role="tablist" aria-label="Authentication mode">
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                aria-controls="auth-form"
                onClick={() => { setMode(m); setError(null); setSuccess(null); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 ${
                  mode === m
                    ? 'bg-gradient-to-r from-primary to-secondary shadow-lg shadow-primary/25 text-white'
                    : 'text-muted-foreground hover:text-foreground/70'
                }`}
              >
                {m === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="w-full space-y-4" id="auth-form" role="tabpanel" aria-label={mode === 'login' ? 'Login form' : 'Signup form'}>
            {/* Email */}
            <div>
              <label htmlFor="auth-email" className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-1.5 block">Email Address</label>
              <div className="relative input-glow rounded-xl border border-white/[0.06] bg-white/[0.03] transition-all">
                <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg" aria-hidden="true">email</span>
                <input
                  id="auth-email"
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="hello@gyeol.ai" required
                  autoComplete="email"
                  className="w-full pl-12 pr-4 py-3.5 bg-transparent rounded-xl text-foreground placeholder:text-muted-foreground/40 outline-none text-sm focus-visible:outline-2 focus-visible:outline-primary"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="auth-password" className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-1.5 block">Password</label>
              <div className="relative input-glow rounded-xl border border-white/[0.06] bg-white/[0.03] transition-all">
                <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg" aria-hidden="true">lock</span>
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••" required minLength={6}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full pl-12 pr-12 py-3.5 bg-transparent rounded-xl text-foreground placeholder:text-muted-foreground/40 outline-none text-sm focus-visible:outline-2 focus-visible:outline-primary"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/60 transition-colors focus-visible:outline-2 focus-visible:outline-primary">
                  <span className="material-icons-round text-lg" aria-hidden="true">{showPassword ? 'visibility' : 'visibility_off'}</span>
                </button>
              </div>
            </div>

            {/* Remember me + Forgot password */}
            {mode === 'login' && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <button type="button" onClick={() => setRememberMe(!rememberMe)}
                    className={`w-4 h-4 rounded border transition-all flex items-center justify-center ${
                      rememberMe ? 'bg-primary border-primary' : 'border-white/20 bg-transparent'
                    }`}>
                    {rememberMe && <span className="material-icons-round text-white text-[12px]">check</span>}
                  </button>
                  <span className="text-[11px] text-muted-foreground">Remember me</span>
                </label>
                <button type="button" onClick={handleForgotPassword}
                  className="text-[11px] text-secondary hover:text-secondary/80 transition font-medium">
                  Forgot Password?
                </button>
              </div>
            )}

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                role="alert" aria-live="assertive"
                className="text-xs text-destructive/80 bg-destructive/5 rounded-xl px-4 py-3">
                {error}
              </motion.p>
            )}
            {success && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                role="status" aria-live="polite"
                className="text-xs text-emerald-400/80 bg-emerald-500/5 rounded-xl px-4 py-3">
                {success}
              </motion.p>
            )}

            {/* Submit button */}
            <button type="submit" disabled={loading}
              className="w-full py-4 mt-2 btn-glow bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-30 text-sm">
              {loading ? 'Processing...' : mode === 'login' ? 'Enter GYEOL' : 'Create Account'}
              {!loading && <span className="material-icons-round text-base">arrow_forward</span>}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 w-full my-6">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">or continue with</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          {/* Social login buttons */}
          <div className="flex gap-3 w-full">
            <button type="button" onClick={handleGoogleLogin}
              className="flex-1 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center gap-2 transition">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
              </svg>
              <span className="text-sm text-foreground/70">Google</span>
            </button>
            <button type="button"
              className="flex-1 py-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center gap-2 transition">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span className="text-sm text-foreground/70">Github</span>
            </button>
          </div>

          {/* reCAPTCHA notice */}
          <p className="text-center text-[9px] text-muted-foreground/50 mt-6 leading-relaxed">
            Protected by reCAPTCHA and subject to the{' '}
            <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground/60 transition">Privacy Policy</Link>
            {' '}and{' '}
            <Link to="/terms" className="underline underline-offset-2 hover:text-foreground/60 transition">Terms of Service</Link>.
          </p>
        </div>
      </motion.main>
    </div>
  );
}
