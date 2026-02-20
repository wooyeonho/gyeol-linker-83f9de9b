import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/src/lib/supabase';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Check for recovery token in URL hash
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setIsRecovery(true);
    } else {
      // No recovery token, redirect to auth
      navigate('/auth', { replace: true });
    }
  }, [navigate]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => navigate('/', { replace: true }), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  if (!isRecovery) return null;

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden font-display bg-background">
      <div className="aurora-bg" />
      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm px-6 py-12 relative z-10"
      >
        <div className="glass-panel rounded-2xl p-8 w-full">
          <div className="mb-8 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/30 to-secondary/20 flex items-center justify-center mb-4">
              <span className="material-icons-round text-2xl text-primary">lock_reset</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">Reset Password</h1>
            <p className="text-muted-foreground text-xs mt-1">Enter your new password</p>
          </div>

          {success ? (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                <span className="material-icons-round text-emerald-400 text-2xl">check_circle</span>
              </div>
              <p className="text-sm text-emerald-400">Password reset successfully!</p>
              <p className="text-xs text-muted-foreground">Redirecting...</p>
            </motion.div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-1.5 block">New Password</label>
                <div className="relative input-glow rounded-xl border border-white/[0.06] bg-white/[0.03]">
                  <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">lock</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••" required minLength={6}
                    className="w-full pl-12 pr-12 py-3.5 bg-transparent rounded-xl text-foreground placeholder:text-muted-foreground/40 outline-none text-sm"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground/60 transition-colors">
                    <span className="material-icons-round text-lg">{showPassword ? 'visibility' : 'visibility_off'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mb-1.5 block">Confirm Password</label>
                <div className="relative input-glow rounded-xl border border-white/[0.06] bg-white/[0.03]">
                  <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">lock</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••" required minLength={6}
                    className="w-full pl-12 pr-4 py-3.5 bg-transparent rounded-xl text-foreground placeholder:text-muted-foreground/40 outline-none text-sm"
                  />
                </div>
              </div>

              {error && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-xs text-destructive/80 bg-destructive/5 rounded-xl px-4 py-3">
                  {error}
                </motion.p>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-4 mt-2 btn-glow bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-30 text-sm">
                {loading ? 'Resetting...' : 'Reset Password'}
                {!loading && <span className="material-icons-round text-base">check</span>}
              </button>
            </form>
          )}
        </div>
      </motion.main>
    </div>
  );
}
