import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function NotFound() {
  const isKo = typeof navigator !== 'undefined' && navigator.language.startsWith('ko');
  return (
    <main className="min-h-screen bg-background font-display flex flex-col items-center justify-center gap-6 relative overflow-hidden">
      <div className="aurora-bg" />

      {/* Animated 404 */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 15, stiffness: 100 }}
        className="relative z-10"
      >
        <div className="relative">
          <motion.span
            className="text-[120px] font-black text-transparent bg-clip-text bg-gradient-to-br from-primary/30 to-secondary/20 leading-none"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            404
          </motion.span>
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="void-dot"
              style={{ width: 24, height: 24 }}
              animate={{ scale: [1, 1.3, 1] }}
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
        <h1 className="text-xl font-bold text-foreground">
          {isKo ? '길을 잃었나봐요' : 'Lost in the void'}
        </h1>
        <p className="text-sm text-muted-foreground max-w-[280px]">
          {isKo
            ? '찾으시는 페이지가 다른 차원으로 떠났나봐요. 돌아가서 새로운 대화를 시작해볼까요?'
            : "The page you're looking for drifted to another dimension. Let's head back."}
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="relative z-10"
      >
        <Link
          to="/"
          className="px-6 py-3 rounded-xl btn-glow bg-gradient-to-r from-primary to-secondary text-primary-foreground text-sm font-bold flex items-center gap-2"
        >
          <span className="material-icons-round text-lg">home</span>
          {isKo ? 'GYEOL로 돌아가기' : 'Back to GYEOL'}
        </Link>
      </motion.div>

      {/* Floating particles */}
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-primary/20"
          style={{
            left: `${15 + i * 15}%`,
            top: `${20 + (i % 3) * 25}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: 3 + i * 0.5,
            repeat: Infinity,
            delay: i * 0.3,
          }}
        />
      ))}
    </main>
  );
}
