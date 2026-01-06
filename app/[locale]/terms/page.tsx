import { getTranslations } from 'next-intl/server';

/**
 * 이용약관 페이지
 */
export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations('terms');

  return (
    <main className="container mx-auto px-4 py-24 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
        <p className="text-gray-400 mb-8">
          {t('lastUpdated')}: {new Date().toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US')}
        </p>

        <div className="prose prose-invert max-w-none space-y-8">
          {/* 제1조 목적 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">제1조 (목적)</h2>
            <p className="text-gray-300 leading-relaxed">
              본 약관은 프롬프트 정음(이하 &quot;회사&quot;)이 제공하는 AI 프롬프트 마켓플레이스 서비스(이하 &quot;서비스&quot;)의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          {/* 제2조 정의 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">제2조 (정의)</h2>
            <div className="space-y-3 text-gray-300">
              <p>1. "서비스"란 회사가 제공하는 AI 프롬프트 거래 플랫폼을 의미합니다.</p>
              <p>2. "이용자"란 본 약관에 따라 서비스를 이용하는 회원 및 비회원을 의미합니다.</p>
              <p>3. "판매자"란 서비스에 프롬프트를 등록하여 판매하는 회원을 의미합니다.</p>
              <p>4. "구매자"란 서비스를 통해 프롬프트를 구매하는 회원을 의미합니다.</p>
              <p>5. "프롬프트"란 AI 모델에 입력하여 원하는 결과를 얻기 위한 텍스트 지시사항을 의미합니다.</p>
            </div>
          </section>

          {/* 제3조 약관의 효력 및 변경 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">제3조 (약관의 효력 및 변경)</h2>
            <div className="space-y-3 text-gray-300">
              <p>1. 본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</p>
              <p>2. 회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있습니다.</p>
              <p>3. 변경된 약관은 공지사항 및 개별 공지를 통해 안내하며, 변경된 약관은 공지한 날로부터 7일 후부터 효력이 발생합니다.</p>
            </div>
          </section>

          {/* 제4조 서비스의 제공 및 변경 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">제4조 (서비스의 제공 및 변경)</h2>
            <div className="space-y-3 text-gray-300">
              <p>1. 회사는 다음과 같은 서비스를 제공합니다:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>AI 프롬프트 마켓플레이스 서비스</li>
                <li>프롬프트 거래 중개 서비스</li>
                <li>결제 대행 서비스</li>
                <li>기타 회사가 추가 개발하거나 제휴계약 등을 통해 제공하는 일체의 서비스</li>
              </ul>
              <p>2. 회사는 서비스의 내용을 변경할 수 있으며, 변경 시 사전에 공지합니다.</p>
            </div>
          </section>

          {/* 제5조 회원가입 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">제5조 (회원가입)</h2>
            <div className="space-y-3 text-gray-300">
              <p>1. 이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 본 약관에 동의한다는 의사표시를 함으로서 회원가입을 신청합니다.</p>
              <p>2. 회사는 제1항과 같이 회원가입을 신청한 이용자 중 다음 각 호에 해당하지 않는 한 회원으로 등록합니다:</p>
              <ul className="list-disc list-inside ml-4 space-y-2">
                <li>가입신청자가 본 약관에 의하여 이전에 회원자격을 상실한 적이 있는 경우</li>
                <li>등록 내용에 허위, 기재누락, 오기가 있는 경우</li>
                <li>기타 회원으로 등록하는 것이 회사의 기술상 현저히 지장이 있다고 판단되는 경우</li>
              </ul>
            </div>
          </section>

          {/* 제6조 거래 및 결제 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">제6조 (거래 및 결제)</h2>
            <div className="space-y-3 text-gray-300">
              <p>1. 구매자는 서비스를 통해 프롬프트를 구매할 수 있으며, 결제는 회사가 지정한 결제 수단을 통해 이루어집니다.</p>
              <p>2. 구매 완료 후 구매자는 해당 프롬프트의 원문을 확인할 수 있습니다.</p>
              <p>3. 구매한 프롬프트는 환불 정책에 따라 환불이 가능할 수 있습니다.</p>
            </div>
          </section>

          {/* 제7조 판매자 의무 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">제7조 (판매자 의무)</h2>
            <div className="space-y-3 text-gray-300">
              <p>1. 판매자는 정확하고 완전한 프롬프트 정보를 제공해야 합니다.</p>
              <p>2. 판매자는 저작권, 지적재산권 등을 침해하지 않는 프롬프트만을 등록해야 합니다.</p>
              <p>3. 판매자는 부적절하거나 불법적인 내용의 프롬프트를 등록하여서는 안 됩니다.</p>
            </div>
          </section>

          {/* 제8조 면책조항 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">제8조 (면책조항)</h2>
            <div className="space-y-3 text-gray-300">
              <p>1. 회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</p>
              <p>2. 회사는 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여는 책임을 지지 않습니다.</p>
              <p>3. 회사는 회원이 서비스를 이용하여 기대하는 수익을 상실한 것에 대하여 책임을 지지 않으며, 그 밖의 서비스를 통하여 얻은 자료로 인한 손해에 관하여 책임을 지지 않습니다.</p>
            </div>
          </section>

          {/* 제9조 분쟁의 해결 */}
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-white">제9조 (분쟁의 해결)</h2>
            <div className="space-y-3 text-gray-300">
              <p>1. 회사와 이용자 간에 발생한 전자상거래 분쟁에 관한 소송은 제소 당시의 이용자의 주소에 의하고, 주소가 없는 경우에는 거소를 관할하는 지방법원의 전속관할로 합니다.</p>
              <p>2. 회사와 이용자 간에 제기된 전자상거래 소송에는 한국법을 적용합니다.</p>
            </div>
          </section>
        </div>
      </main>
  );
}

