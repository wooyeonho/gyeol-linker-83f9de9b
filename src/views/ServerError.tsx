/**
 * 500 서버 에러 페이지
 */
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function ServerError() {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 relative overflow-hidden" role="main">
      <div className="aurora-bg" />

      {/* Animated 500 */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 15, stiffness: 100 }}
        className="relative z-10"
      >
        <div className="relative">
          <motion.span
            className="text-[120px] font-black text-transparent bg-clip-text bg-gradient-to-br from-destructive/40 to-destructive/20 leading-none"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            500
          </motion.span>
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="w-6 h-6 rounded-full bg-destructive/30"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center space-y-3 relative z-10"
      >
        <h1 className="text-xl font-bold text-foreground">서버에 문제가 생겼어요</h1>
        <p className="text-sm text-muted-foreground max-w-[280px]">
          잠시 후 다시 시도해주세요. 문제가 계속되면 앱을 새로고침 해보세요.
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="relative z-10 flex gap-3"
      >
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-3 rounded-xl bg-muted/10 text-foreground/70 text-sm font-bold flex items-center gap-2 hover:bg-muted/20 transition"
        >
          <span className="material-icons-round text-lg">refresh</span>
          새로고침
        </button>
        <Link
          to="/"
          className="px-5 py-3 rounded-xl btn-glow bg-gradient-to-r from-primary to-secondary text-white text-sm font-bold flex items-center gap-2"
        >
          <span className="material-icons-round text-lg">home</span>
          홈으로
        </Link>
      </motion.div>

      {/* Glitch particles */}
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1.5 h-1.5 rounded-full bg-destructive/20"
          style={{ left: `${10 + i * 12}%`, top: `${15 + (i % 4) * 20}%` }}
          animate={{ y: [0, -15, 0], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 2.5 + i * 0.3, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </main>
  );
}
