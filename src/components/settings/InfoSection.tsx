import { Link } from 'react-router-dom';

interface InfoSectionProps {
  feedbackOpen: boolean;
  setFeedbackOpen: (v: boolean) => void;
  referralCode: string | null;
  referralCount: number;
  loadOrCreateCode: () => void;
  referralInput: string;
  setReferralInput: (v: string) => void;
  referralMsg: string;
  setReferralMsg: (v: string) => void;
  applyReferralCode: (code: string) => Promise<boolean>;
  exportData: () => void;
  exporting: boolean;
}

export function InfoSection({
  setFeedbackOpen, referralCode, referralCount, loadOrCreateCode,
  referralInput, setReferralInput, referralMsg, setReferralMsg,
  applyReferralCode, exportData, exporting,
}: InfoSectionProps) {
  return (
    <div className="glass-card rounded-2xl overflow-hidden p-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <span aria-hidden="true" className="material-icons-round text-primary text-sm">info</span>
        <h2 className="text-sm font-semibold text-foreground">Info</h2>
      </div>
      <section className="px-4 mt-6 space-y-3">
        <button type="button" onClick={() => setFeedbackOpen(true)}
          className="w-full py-2.5 rounded-xl text-xs font-medium border border-primary/20 bg-primary/5 text-primary/70 hover:bg-primary/10 transition flex items-center justify-center gap-2">
          <span aria-hidden="true" className="material-icons-round text-sm">feedback</span> Send Feedback
        </button>
        <div className="p-3 rounded-xl border border-border/10 bg-card/30 space-y-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Invite Friends</p>
          <div className="flex gap-2">
            <input readOnly value={referralCode ?? ''} onClick={() => { if (!referralCode) loadOrCreateCode(); }}
              placeholder="Click to generate code" className="flex-1 bg-background/50 border border-border/10 rounded-lg px-2 py-1.5 text-xs text-foreground" />
            {referralCode && (
              <button type="button" onClick={() => { navigator.clipboard.writeText(referralCode); }}
                className="px-3 py-1.5 rounded-lg text-xs bg-primary/10 text-primary border border-primary/20">Copy</button>
            )}
          </div>
          {referralCount > 0 && <p className="text-[10px] text-muted-foreground">Invited: {referralCount}</p>}
          <div className="flex gap-2 mt-1">
            <input value={referralInput} onChange={e => setReferralInput(e.target.value)}
              placeholder="Enter invite code" className="flex-1 bg-background/50 border border-border/10 rounded-lg px-2 py-1.5 text-xs text-foreground" />
            <button type="button" onClick={async () => {
              const ok = await applyReferralCode(referralInput);
              setReferralMsg(ok ? 'Applied! +50 coins' : 'Invalid code');
              setTimeout(() => setReferralMsg(''), 3000);
            }} className="px-3 py-1.5 rounded-lg text-xs bg-primary/10 text-primary border border-primary/20">Apply</button>
          </div>
          {referralMsg && <p className="text-[10px] text-primary/70">{referralMsg}</p>}
        </div>
        <button type="button" onClick={exportData} disabled={exporting}
          className="w-full py-2.5 rounded-xl text-xs font-medium border border-border/20 bg-card/30 text-foreground/70 hover:bg-card/50 transition flex items-center justify-center gap-2">
          <span aria-hidden="true" className="material-icons-round text-sm">download</span>
          {exporting ? 'Preparing...' : 'Export My Data (JSON)'}
        </button>
      </section>
      <div className="flex gap-3 justify-center mt-4 mb-8">
        <Link to="/terms" className="text-xs text-muted-foreground hover:text-foreground underline decoration-border underline-offset-2 transition">Terms</Link>
        <Link to="/privacy" className="text-xs text-muted-foreground hover:text-foreground underline decoration-border underline-offset-2 transition">Privacy</Link>
        <Link to="/admin" className="text-xs text-muted-foreground hover:text-foreground underline decoration-border underline-offset-2 transition">Admin</Link>
      </div>
    </div>
  );
}
