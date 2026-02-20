import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  itemName: string;
  itemPrice: number;
  itemDescription?: string;
  currentBalance?: number;
  loading?: boolean;
}

export function PurchaseConfirmModal({
  open, onClose, onConfirm, itemName, itemPrice,
  itemDescription, currentBalance = 0, loading
}: Props) {
  const remaining = currentBalance - itemPrice;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[80] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}>
            <div className="glass-card-selected rounded-2xl p-6 w-full max-w-sm backdrop-blur-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-foreground">Confirm Purchase</h2>
                <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/5">
                  <span className="material-icons-round text-slate-400">close</span>
                </button>
              </div>
              <p className="text-sm text-slate-400 mb-5">{itemDescription || 'Please review the details.'}</p>
              
              <div className="glass-card rounded-2xl p-5 flex flex-col items-center gap-3 mb-5">
                <div className="relative">
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl" />
                  <div className="relative w-16 h-16 rounded-xl bg-gradient-to-br from-primary/30 to-secondary/10 border border-white/10 flex items-center justify-center">
                    <span className="material-icons-round text-primary text-3xl">auto_awesome</span>
                  </div>
                </div>
                <p className="font-bold text-foreground text-lg">{itemName}</p>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-secondary/20 text-secondary font-medium uppercase tracking-wider">Rare Item</span>
              </div>
              
              <div className="glass-card rounded-xl p-4 space-y-3 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Current Balance</span>
                  <span className="text-foreground font-medium">{currentBalance.toLocaleString()} GP</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Item Cost</span>
                  <span className="text-secondary font-bold">- {itemPrice.toLocaleString()} GP</span>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Remaining</span>
                  <span className={`font-bold ${remaining >= 0 ? 'text-foreground' : 'text-destructive'}`}>{remaining.toLocaleString()} GP</span>
                </div>
              </div>
              
              <button onClick={onConfirm} disabled={loading || remaining < 0}
                className="w-full py-4 btn-glow bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-full active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-30 mb-3">
                <span className="material-icons-round text-lg">fingerprint</span>
                {loading ? 'Processing...' : 'Confirm Purchase'}
              </button>
              <button onClick={onClose}
                className="w-full py-3 rounded-full text-slate-400 text-sm font-medium hover:text-foreground hover:bg-white/5 transition">
                Keep Looking →
              </button>
              <p className="text-center text-[10px] text-slate-500 mt-3 flex items-center justify-center gap-1">
                <span className="material-icons-round text-[12px]">lock</span>
                Secure Transaction via GYEOL Chain
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
