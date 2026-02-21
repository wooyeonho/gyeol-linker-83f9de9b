import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const TERMS_KO = {
  title: '이용약관',
  updated: '최종 수정일: 2026년 2월 21일',
  sections: [
    { title: '1. 서비스 정의', content: '결(GYEOL)은 AI 동반자 서비스입니다. 사용자는 AI 에이전트와 대화하고, 진화시키며, 소셜 활동에 참여할 수 있습니다. 본 서비스는 주식회사 결(이하 "회사")이 제공합니다.' },
    { title: '2. 이용 조건', content: '본 서비스를 이용하려면 만 14세 이상이어야 합니다. 만 14세 미만의 경우 법정대리인의 동의가 필요합니다. 회원가입 시 정확한 정보를 제공해야 하며, 계정 보안은 사용자 본인의 책임입니다.' },
    { title: '3. 금지 행위', content: '다음 행위는 엄격히 금지됩니다:\n• 타인을 사칭하거나 허위 정보를 유포하는 행위\n• 욕설, 혐오 표현, 성적 콘텐츠를 생성·공유하는 행위\n• 시스템을 해킹하거나 악용하는 행위\n• 스팸, 광고, 피싱 등 상업적 악용\n• AI를 이용한 불법 행위 유도\n• 다른 사용자를 괴롭히는 행위' },
    { title: '4. 면책 조항', content: 'AI가 생성한 응답은 참고용이며, 의료·법률·금융 등 전문 분야의 조언을 대체하지 않습니다. AI 응답의 정확성을 보장하지 않으며, AI 응답에 의한 손해에 대해 회사는 책임을 지지 않습니다.' },
    { title: '5. AI 생성 콘텐츠 책임', content: 'AI가 생성한 콘텐츠의 저작권은 서비스 이용약관에 따릅니다. 사용자가 AI와의 대화를 통해 생성한 콘텐츠를 외부에 공유할 경우, 그 내용에 대한 책임은 사용자에게 있습니다. 회사는 서비스 개선 목적으로 익명화된 대화 데이터를 활용할 수 있습니다.' },
    { title: '6. 지적재산권', content: '서비스의 디자인, 로고, 소프트웨어, 코드 등 모든 지적재산권은 회사에 귀속됩니다. 사용자가 생성한 에이전트 이름, 성격 설정 등은 사용자에게 귀속되나, 서비스 내에서의 이용 라이선스를 회사에 부여합니다.' },
    { title: '7. 계정 해지', content: '사용자는 언제든지 설정에서 계정을 삭제할 수 있습니다. 계정 삭제 시 모든 데이터(대화, 에이전트, 메모리 등)가 즉시 삭제되며 복구가 불가능합니다. 법적 의무에 따라 일부 기록은 30일간 보관될 수 있습니다.' },
    { title: '8. 서비스 변경 및 중단', content: '회사는 서비스 내용을 변경하거나 중단할 수 있으며, 중요한 변경 시 사전에 공지합니다. 본 약관은 변경될 수 있으며, 변경 후 계속 이용 시 변경된 약관에 동의한 것으로 간주합니다.' },
  ],
};

const TERMS_EN = {
  title: 'Terms of Service',
  updated: 'Last updated: February 21, 2026',
  sections: [
    { title: '1. Service Description', content: 'GYEOL is an AI companion service. Users can chat with AI agents, evolve them, and participate in social activities. This service is provided by GYEOL Inc.' },
    { title: '2. Eligibility', content: 'You must be at least 14 years old to use this service. Users under 14 require parental or legal guardian consent. You must provide accurate information during registration and are responsible for your account security.' },
    { title: '3. Prohibited Activities', content: 'The following are strictly prohibited:\n• Impersonating others or spreading false information\n• Creating or sharing offensive, hateful, or sexual content\n• Hacking or exploiting the system\n• Spam, advertising, phishing, or commercial abuse\n• Using AI to facilitate illegal activities\n• Harassing other users' },
    { title: '4. Disclaimer', content: 'AI-generated responses are for reference only and do not substitute professional advice in medical, legal, financial, or other specialized fields. The Company does not guarantee the accuracy of AI responses and is not liable for damages resulting from AI responses.' },
    { title: '5. AI Content Responsibility', content: 'Copyright of AI-generated content is subject to these Terms. Users are responsible for any AI-generated content they share externally. The Company may use anonymized conversation data for service improvement.' },
    { title: '6. Intellectual Property', content: 'All intellectual property including design, logos, software, and code belongs to the Company. Agent names and personality settings created by users belong to the user, but a usage license within the service is granted to the Company.' },
    { title: '7. Account Termination', content: 'Users can delete their account at any time from Settings. Upon deletion, all data (conversations, agents, memories, etc.) will be immediately deleted and cannot be recovered. Some records may be retained for 30 days as required by law.' },
    { title: '8. Service Changes', content: 'The Company may modify or discontinue the service with advance notice for significant changes. These terms may be updated, and continued use after changes constitutes acceptance of the modified terms.' },
  ],
};

export default function Terms() {
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const t = lang === 'ko' ? TERMS_KO : TERMS_EN;

  return (
    <main className="min-h-screen bg-background p-4 sm:p-6 font-display relative">
      <div className="aurora-bg" />
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="glass-panel rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-foreground">{t.title}</h1>
          <button onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')}
            className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition">
            {lang === 'ko' ? 'English' : '한국어'}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-6">{t.updated}</p>
        <div className="text-sm text-foreground/70 space-y-5 leading-relaxed">
          {t.sections.map((s, i) => (
            <div key={i}>
              <h2 className="font-semibold text-foreground/90 mb-1.5">{s.title}</h2>
              <p className="whitespace-pre-line">{s.content}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-8">
          <Link to="/" className="text-primary text-xs hover:underline">{lang === 'ko' ? '← 돌아가기' : '← Back'}</Link>
          <Link to="/privacy" className="text-primary text-xs hover:underline">{lang === 'ko' ? '개인정보처리방침 →' : 'Privacy Policy →'}</Link>
        </div>
      </motion.div>
    </main>
  );
}
