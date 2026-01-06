import { getTranslations } from 'next-intl/server';

/**
 * 개인정보 처리방침 페이지
 */
export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('privacy');

  return (
    <main className="container mx-auto px-4 py-24 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
        <p className="text-gray-400 mb-8">
          {t('lastUpdated')}: {new Date().toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US')}
        </p>

        <div className="prose prose-invert max-w-none space-y-8">
          {/* 제1조 개인정보의 처리목적 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">제1조 (개인정보의 처리목적)</h2>
            <p className="text-gray-300 leading-relaxed mb-3">
              프롬프트 정음(이하 &quot;회사&quot;)은 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보 보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
            </p>
            <div className="space-y-3 text-gray-300">
              <p>1. 회원 가입 및 관리: 회원 가입의사 확인, 회원제 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리, 서비스 부정이용 방지 목적</p>
              <p>2. 재화 또는 서비스 제공: 서비스 제공, 콘텐츠 제공, 본인인증, 요금결제·정산</p>
              <p>3. 마케팅 및 광고에의 활용: 신규 서비스(제품) 개발 및 맞춤 서비스 제공, 이벤트 및 광고성 정보 제공 및 참여기회 제공</p>
            </div>
          </section>

          {/* 제2조 개인정보의 처리 및 보유기간 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">제2조 (개인정보의 처리 및 보유기간)</h2>
            <div className="space-y-3 text-gray-300">
              <p>1. 회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.</p>
              <p>2. 각각의 개인정보 처리 및 보유 기간은 다음과 같습니다:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>회원 가입 및 관리: 회원 탈퇴 시까지 (다만, 관계 법령 위반에 따른 수사·조사 등이 진행중인 경우에는 해당 수사·조사 종료 시까지)</li>
                <li>재화 또는 서비스 제공: 재화·서비스 공급완료 및 요금결제·정산 완료 시까지</li>
                <li>전자상거래에서의 계약·청약철회 등에 관한 기록: 5년</li>
                <li>대금결제 및 재화 등의 공급에 관한 기록: 5년</li>
                <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년</li>
              </ul>
            </div>
          </section>

          {/* 제3조 처리하는 개인정보의 항목 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">제3조 (처리하는 개인정보의 항목)</h2>
            <div className="space-y-3 text-gray-300">
              <p>회사는 다음의 개인정보 항목을 처리하고 있습니다:</p>
              <p className="font-semibold">1. 회원 가입 및 관리</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>필수항목: 이메일, 이름(선택)</li>
                <li>자동 수집 항목: IP주소, 쿠키, 접속 로그</li>
              </ul>
              <p className="font-semibold">2. 재화 또는 서비스 제공</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>필수항목: 이메일, 결제정보</li>
                <li>선택항목: 배송지 정보(필요한 경우)</li>
              </ul>
            </div>
          </section>

          {/* 제4조 개인정보의 제3자 제공 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">제4조 (개인정보의 제3자 제공)</h2>
            <div className="space-y-3 text-gray-300">
              <p>1. 회사는 정보주체의 개인정보를 제1조(개인정보의 처리목적)에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 개인정보 보호법 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.</p>
              <p>2. 회사는 원활한 서비스 제공을 위해 다음의 제3자에게 개인정보를 제공할 수 있습니다:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>결제 대행 업체: 결제 처리 및 환불 처리</li>
                <li>클라우드 서비스 제공업체: 서비스 운영 및 데이터 저장</li>
              </ul>
            </div>
          </section>

          {/* 제5조 개인정보처리의 위탁 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">제5조 (개인정보처리의 위탁)</h2>
            <div className="space-y-3 text-gray-300">
              <p>1. 회사는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>위탁받는 자(수탁자): Supabase</li>
                <li>위탁하는 업무의 내용: 데이터베이스 관리 및 서버 운영</li>
              </ul>
              <p>2. 회사는 위탁계약 체결 시 개인정보 보호법 제26조에 따라 위탁업무 수행목적 외 개인정보 처리금지, 기술적·관리적 보호조치, 재위탁 제한, 수탁자에 대한 관리·감독, 손해배상 등에 관한 사항을 계약서 등 문서에 명시하고, 수탁자가 개인정보를 안전하게 처리하는지를 감독하고 있습니다.</p>
            </div>
          </section>

          {/* 제6조 정보주체의 권리·의무 및 행사방법 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">제6조 (정보주체의 권리·의무 및 행사방법)</h2>
            <div className="space-y-3 text-gray-300">
              <p>1. 정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>개인정보 처리정지 요구권</li>
                <li>개인정보 열람요구권</li>
                <li>개인정보 정정·삭제요구권</li>
                <li>개인정보 처리정지 요구권</li>
              </ul>
              <p>2. 제1항에 따른 권리 행사는 회사에 대해 서면, 전자우편, 모사전송(FAX) 등을 통하여 하실 수 있으며 회사는 이에 대해 지체 없이 조치하겠습니다.</p>
            </div>
          </section>

          {/* 제7조 개인정보의 파기 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">제7조 (개인정보의 파기)</h2>
            <div className="space-y-3 text-gray-300">
              <p>1. 회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체없이 해당 개인정보를 파기합니다.</p>
              <p>2. 개인정보 파기의 절차 및 방법은 다음과 같습니다:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>파기절차: 회사는 파기 사유가 발생한 개인정보를 선정하고, 회사의 개인정보 보호책임자의 승인을 받아 개인정보를 파기합니다.</li>
                <li>파기방법: 전자적 파일 형태의 정보는 기록을 재생할 수 없는 기술적 방법을 사용합니다.</li>
              </ul>
            </div>
          </section>

          {/* 제8조 개인정보 보호책임자 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">제8조 (개인정보 보호책임자)</h2>
            <div className="space-y-3 text-gray-300">
              <p>1. 회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
              <div className="bg-gray-900 border border-gray-800 rounded-[24px] p-4 mt-4">
                <p className="font-semibold mb-2">개인정보 보호책임자</p>
                <p>이메일: privacy@prompt-jeongeum.com</p>
              </div>
            </div>
          </section>
        </div>
      </main>
  );
}

