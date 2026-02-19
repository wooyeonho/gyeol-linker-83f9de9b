import { Link } from 'react-router-dom';

export default function Privacy() {
  return (
    <main className="min-h-screen bg-background p-6 max-w-2xl mx-auto font-display">
      <h1 className="text-xl font-bold text-foreground mb-4">Privacy Policy</h1>
      <div className="text-sm text-foreground/70 space-y-4 leading-relaxed">
        <p>Last updated: February 19, 2026</p>

        <h2 className="font-semibold text-foreground/90 mt-6">1. Data We Collect</h2>
        <p>Email address (for authentication), conversation messages, AI personality settings, and usage analytics.</p>

        <h2 className="font-semibold text-foreground/90 mt-6">2. How We Use Data</h2>
        <p>To provide the AI companion service, improve AI responses, and personalize your experience. We do not sell your data.</p>

        <h2 className="font-semibold text-foreground/90 mt-6">3. Data Storage</h2>
        <p>Data is stored securely on encrypted servers. Conversations are associated with your account.</p>

        <h2 className="font-semibold text-foreground/90 mt-6">4. Third-Party AI Providers</h2>
        <p>Messages are sent to AI providers (Groq, Google Gemini) for response generation. These providers process but do not permanently store your messages.</p>

        <h2 className="font-semibold text-foreground/90 mt-6">5. Your Rights</h2>
        <p>You can: view your data, export your data, delete your account and all data, and withdraw consent at any time.</p>

        <h2 className="font-semibold text-foreground/90 mt-6">6. Children's Privacy</h2>
        <p>GYEOL offers a Kids Safe mode that filters content. Users under 13 require parental consent.</p>

        <h2 className="font-semibold text-foreground/90 mt-6">7. Contact</h2>
        <p>For privacy concerns: privacy@gyeol.app</p>
      </div>
      <Link to="/" className="text-primary text-xs mt-8 inline-block">← Back</Link>
    </main>
  );
}