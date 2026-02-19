import { Link } from 'react-router-dom';

export default function Terms() {
  return (
    <main className="min-h-screen bg-background p-6 font-display relative">
      <div className="aurora-bg" />
      <div className="glass-panel rounded-2xl p-8 max-w-2xl mx-auto relative z-10">
        <h1 className="text-xl font-bold text-foreground mb-4">Terms of Service</h1>
        <div className="text-sm text-foreground/70 space-y-4 leading-relaxed">
          <p>Last updated: February 19, 2026</p>

          <h2 className="font-semibold text-foreground/90 mt-6">1. Service Description</h2>
          <p>GYEOL is an AI companion service. Your AI learns from conversations and evolves over time.</p>

          <h2 className="font-semibold text-foreground/90 mt-6">2. User Accounts</h2>
          <p>You must be at least 13 years old to use this service. If under 18, parental consent is required. You are responsible for your account security.</p>

          <h2 className="font-semibold text-foreground/90 mt-6">3. Acceptable Use</h2>
          <p>Do not use GYEOL to generate harmful, illegal, or abusive content. We reserve the right to suspend accounts that violate these terms.</p>

          <h2 className="font-semibold text-foreground/90 mt-6">4. AI Limitations</h2>
          <p>GYEOL is an AI and may produce inaccurate information. Do not rely on it for medical, legal, or financial advice.</p>

          <h2 className="font-semibold text-foreground/90 mt-6">5. Data & Privacy</h2>
          <p>See our <Link to="/privacy" className="text-primary underline">Privacy Policy</Link> for details on data collection and usage.</p>

          <h2 className="font-semibold text-foreground/90 mt-6">6. Account Deletion</h2>
          <p>You can delete your account and all associated data at any time from Settings.</p>

          <h2 className="font-semibold text-foreground/90 mt-6">7. Changes</h2>
          <p>We may update these terms. Continued use after changes constitutes acceptance.</p>
        </div>
        <Link to="/" className="text-primary text-xs mt-8 inline-block">← Back</Link>
      </div>
    </main>
  );
}
