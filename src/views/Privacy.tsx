import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const PRIVACY_KO = {
  title: '개인정보처리방침',
  updated: '최종 수정일: 2026년 2월 21일',
  sections: [
    { title: '1. 수집하는 개인정보 항목', content: '회사는 서비스 제공을 위해 Next 정보를 수집합니다:\n• 이메일 주소 (회원가입 및 인증)\n• 대화 내용 (암호화 Save)\n• AI Personality 데이터 (에Previous트 Settings, Evolution 기록)\n• 서비스 이용 기록 (접속 로그, 기능 사용 통계)\n• 기기 정보 (브라우저 종류, OS)' },
    { title: '2. 수집 목적', content: '수집된 개인정보는 Next 목적으로 사용됩니다:\n• AI 동반자 서비스 제공 및 개인화\n• AI Personality Evolution 및 학습\n• 서비스 개선 및 신규 기능 개발\n• 부정 이용 방지 및 서비스 안정성 확보\n• 이용자 문의 및 불만 처리' },
    { title: '3. 보관 기간', content: '개인정보는 수집 목적 달성 시까지 보관되며, 회원 탈퇴 시 즉시 삭제됩니다. 단, 관련 법령에 따라 일정 기간 보관이 필요한 경우:\n• 계약 또는 청약철회에 관한 기록: 5년\n• 소비자 불만 또는 분쟁 처리 기록: 3년\n• 접속 로그: 3개월' },
    { title: '4. 제3자 제공', content: 'AI 응답 생성을 위해 대화 내용이 Next AI 모델 제공사에 전달됩니다:\n• Google (Gemini) — 대화 처리\n• Groq — 대화 처리 (폴백)\n\n전달되는 데이터는 익명화되며, 사용자를 식별할 수 있는 정보는 포함되지 않습니다. AI 제공사는 전달받은 데이터를 모델 학습에 사용하지 않습니다.' },
    { title: '5. 개인정보 보호 조치', content: '회사는 개인정보 보호를 위해 Next 조치를 시행합니다:\n• 대화 내용 암호화 Save (AES-256)\n• SSL/TLS를 통한 데이터 Send 암호화\n• 접근 권한 최소화 및 접근 로그 관리\n• 정기적 보안 점검 및 취약점 개선' },
    { title: '6. 이용자의 권리', content: '이용자는 Next 권리를 행사할 수 있습니다:\n• 개인정보 열람 요청\n• 개인정보 정정 요청\n• 개인정보 삭제 요청 (Delete Account)\n• 개인정보 처리 정지 요청\n• 개인정보 이동권 (데이터 내보내기)\n\nSettings 페이지에서 직접 실행하거나, 아래 연락처로 요청할 수 있습니다.' },
    { title: '7. 쿠키 정책', content: '서비스는 사용자 인증 및 환경 Settings Save을 위해 쿠키를 사용합니다. 브라우저 Settings에서 쿠키를 비활성화할 수 있으나, 이 경우 서비스 이용에 제한이 있을 수 있습니다.' },
    { title: '8. 아동의 개인정보', content: '만 14세 미만 아동의 개인정보 수집 시 법정대리인의 동의를 받습니다. 키즈 세이프 모드를 통해 부적절한 콘텐츠를 필터링합니다.' },
    { title: '9. GDPR 준수 (EU 거주자)', content: 'EU 거주자의 경우 GDPR에 따른 추가 권리가 보장됩니다:\n• 데이터 처리의 법적 근거: 동의 및 계약 이행\n• 데이터 이동권: JSON 형식 데이터 내보내기\n• 잊힐 권리: Delete Account 시 모든 데이터 즉시 삭제\n• 이의 제기권: 자동화된 의사결정에 대한 이의 제기' },
    { title: '10. 개인정보 보호책임자', content: '개인정보 보호책임자: GYEOL 개인정보보호팀\n이메일: privacy@gyeol.app\n주소: 대한민국 서울특별시\n\n개인정보 침해 신고: 개인정보분쟁조정위원회 (www.kopico.go.kr)' },
  ],
};

const PRIVACY_EN = {
  title: 'Privacy Policy',
  updated: 'Last updated: February 21, 2026',
  sections: [
    { title: '1. Information We Collect', content: 'We collect the following information to provide our service:\n• Email address (registration and authentication)\n• Conversation content (encrypted storage)\n• AI personality data (agent settings, evolution history)\n• Usage records (access logs, feature usage statistics)\n• Device information (browser type, OS)' },
    { title: '2. Purpose of Collection', content: 'Collected information is used for:\n• Providing and personalizing the AI companion service\n• AI personality evolution and learning\n• Service improvement and new feature development\n• Preventing abuse and ensuring service stability\n• Handling user inquiries and complaints' },
    { title: '3. Retention Period', content: 'Personal information is retained until the purpose of collection is fulfilled and is deleted immediately upon account deletion. However, certain records may be retained as required by law:\n• Contract/withdrawal records: 5 years\n• Consumer complaint records: 3 years\n• Access logs: 3 months' },
    { title: '4. Third-Party Sharing', content: 'Conversation content is shared with the following AI providers for response generation:\n• Google (Gemini) — conversation processing\n• Groq — conversation processing (fallback)\n\nShared data is anonymized and does not include personally identifiable information. AI providers do not use the data for model training.' },
    { title: '5. Security Measures', content: 'We implement the following security measures:\n• AES-256 encryption for stored conversations\n• SSL/TLS encryption for data transmission\n• Minimal access privileges and access log management\n• Regular security audits and vulnerability improvements' },
    { title: '6. Your Rights', content: 'You have the following rights:\n• Right to access your personal information\n• Right to correct your personal information\n• Right to delete your personal information (account deletion)\n• Right to restrict processing\n• Right to data portability (data export)\n\nYou can exercise these rights from the Settings page or contact us below.' },
    { title: '7. Cookie Policy', content: 'The service uses cookies for user authentication and preference storage. You can disable cookies in your browser settings, but this may limit service functionality.' },
    { title: '8. Children\'s Privacy', content: 'We obtain parental consent before collecting personal information from children under 14. Kids Safe mode filters inappropriate content.' },
    { title: '9. GDPR Compliance (EU Residents)', content: 'EU residents are guaranteed additional rights under GDPR:\n• Legal basis for processing: consent and contract performance\n• Data portability: JSON format data export\n• Right to be forgotten: immediate deletion upon account deletion\n• Right to object: objection to automated decision-making' },
    { title: '10. Data Protection Officer', content: 'Data Protection Officer: GYEOL Privacy Team\nEmail: privacy@gyeol.app\nAddress: Seoul, South Korea' },
  ],
};

export default function Privacy() {
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const t = lang === 'ko' ? PRIVACY_KO : PRIVACY_EN;

  return (
    <main role="main" className="min-h-screen bg-background p-4 sm:p-6 font-display relative">
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
          <Link to="/terms" className="text-primary text-xs hover:underline">{lang === 'ko' ? '← 이용약관' : '← Terms of Service'}</Link>
        </div>
      </motion.div>
    </main>
  );
}
