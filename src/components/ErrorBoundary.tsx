import { Component, ReactNode } from 'react';
import { motion } from 'framer-motion';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 p-6">
          <div className="aurora-bg" />
          <div className="relative z-10 flex flex-col items-center gap-5 max-w-sm text-center">
            {/* Animated error icon */}
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className="w-20 h-20 rounded-2xl bg-destructive/10 flex items-center justify-center"
            >
              <span className="material-icons-round text-4xl text-destructive/60">warning_amber</span>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="space-y-2">
              <h2 className="text-base font-bold text-foreground">문제가 발생했어요</h2>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                걱정하지 마세요. 데이터는 안전합니다.<br />아래 버튼을 눌러 다시 시도해보세요.
              </p>
            </motion.div>

            {/* Error detail (collapsible) */}
            {this.state.error && (
              <details className="w-full text-left">
                <summary className="text-[10px] text-muted-foreground/50 cursor-pointer hover:text-muted-foreground transition">
                  기술 정보 보기
                </summary>
                <pre className="mt-2 p-3 rounded-xl bg-muted/10 text-[9px] text-muted-foreground/60 overflow-auto max-h-32 font-mono whitespace-pre-wrap break-all">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <div className="flex gap-3 w-full">
              <button
                onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
                className="flex-1 py-3 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition flex items-center justify-center gap-2"
                aria-label="홈으로 돌아가기"
              >
                <span className="material-icons-round text-sm">home</span>
                홈으로
              </button>
              <button
                onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
                className="flex-1 py-3 rounded-xl bg-muted/10 text-foreground/70 text-sm font-medium hover:bg-muted/20 transition flex items-center justify-center gap-2"
                aria-label="페이지 새로고침"
              >
                <span className="material-icons-round text-sm">refresh</span>
                새로고침
              </button>
            </div>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
