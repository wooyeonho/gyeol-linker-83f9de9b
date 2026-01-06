'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import { Database, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

// Premium sample prompts data
const SAMPLE_PROMPTS = [
  {
    title_ko: 'ChatGPT: 이메일 오픈율 10배 향상 시스템',
    title_en: 'ChatGPT: 10x Email Open Rates System',
    description_ko: 'Fortune 500 마케터들이 사용하는 검증된 시스템으로, 업계 평균보다 10배 높은 참여율을 달성하는 개인화된 이메일을 생성합니다. A/B 테스트 프레임워크가 포함되어 있습니다.',
    description_en: 'Proven system used by Fortune 500 marketers to generate personalized emails with 10x higher engagement than industry averages. Includes A/B testing framework and personalization templates.',
    content: `You are an expert email marketer with 15 years of experience at companies like Apple, Nike, and Tesla. Your specialty is crafting personalized emails that achieve 10x higher open rates than industry averages.

TASK: Create a high-converting email for [PRODUCT/SERVICE] targeting [AUDIENCE].

FRAMEWORK:
1. Subject Line (use curiosity gap or personalization)
2. Preview Text (complement the subject, don't repeat)
3. Opening Hook (personal story or surprising statistic)
4. Value Proposition (3 bullet points max)
5. Social Proof (testimonial or case study)
6. Clear CTA (single action, urgent language)
7. P.S. Line (reinforce main benefit)

RULES:
- Keep subject under 50 characters
- Use recipient's name in first sentence
- Include exactly one emoji in subject
- Write at 8th grade reading level
- Create urgency without being pushy

OUTPUT: Provide 3 variations for A/B testing with predicted open rates.`,
    price: 29.99,
    ai_model: 'chatgpt',
    category_ko: '마케팅',
    category_en: 'Marketing',
    tags: ['email', 'marketing', 'copywriting', 'conversion', 'ab-testing'],
  },
  {
    title_ko: 'Midjourney: 프리미엄 로고 디자인 마스터',
    title_en: 'Midjourney: Premium Logo Design Master',
    description_ko: '브랜드 아이덴티티 전문가가 설계한 로고 생성 시스템입니다. 미니멀리스트부터 빈티지까지 다양한 스타일을 지원하며, 실제 사용 가능한 고품질 로고를 생성합니다.',
    description_en: 'Logo generation system designed by brand identity experts. Supports styles from minimalist to vintage, generating production-ready high-quality logos for real-world use.',
    content: `Create a professional logo design with the following specifications:

BRAND: [BRAND NAME]
INDUSTRY: [INDUSTRY]
STYLE: [minimalist/modern/vintage/playful/luxury/tech]
COLOR PREFERENCE: [colors or "suggest based on industry"]

PROMPT STRUCTURE:
"Professional [STYLE] logo design for [BRAND NAME], [INDUSTRY] company, [key brand values], clean vector style, suitable for business cards and large signage, white background, --ar 1:1 --v 6 --style raw"

VARIATIONS TO GENERATE:
1. Icon-based (symbol only)
2. Wordmark (typography focus)
3. Combination mark (icon + text)
4. Abstract geometric
5. Mascot/character (if appropriate)

TECHNICAL SPECS:
- Aspect ratio: 1:1 for primary, 16:9 for banner
- Style: raw for cleaner output
- Version: 6 for best quality
- Add "--no text" for icon-only versions

OUTPUT: 5 unique logo concepts with usage recommendations.`,
    price: 49.99,
    ai_model: 'midjourney',
    category_ko: '디자인',
    category_en: 'Design',
    tags: ['logo', 'branding', 'design', 'midjourney', 'visual-identity'],
  },
  {
    title_ko: 'Claude: 시니어 개발자 코드 리뷰 시스템',
    title_en: 'Claude: Senior Developer Code Review System',
    description_ko: 'FAANG 출신 시니어 개발자의 관점으로 코드를 리뷰합니다. 보안 취약점, 성능 최적화, 클린 코드 원칙, 테스트 커버리지까지 종합적으로 분석합니다.',
    description_en: 'Review code from the perspective of a FAANG senior developer. Comprehensive analysis covering security vulnerabilities, performance optimization, clean code principles, and test coverage.',
    content: `You are a Senior Software Engineer with 12 years of experience at Google, Meta, and Stripe. You specialize in code review with a focus on production-readiness.

REVIEW THE FOLLOWING CODE:
\`\`\`
[PASTE CODE HERE]
\`\`\`

ANALYSIS FRAMEWORK:

1. SECURITY AUDIT
   - SQL injection vulnerabilities
   - XSS attack vectors
   - Authentication/authorization issues
   - Sensitive data exposure
   - Input validation gaps

2. PERFORMANCE REVIEW
   - Time complexity analysis
   - Memory usage concerns
   - Database query optimization
   - Caching opportunities
   - Async/await patterns

3. CODE QUALITY
   - SOLID principles adherence
   - DRY violations
   - Function length and complexity
   - Naming conventions
   - Error handling patterns

4. MAINTAINABILITY
   - Documentation needs
   - Test coverage gaps
   - Refactoring suggestions
   - Technical debt identification

5. PRODUCTION READINESS
   - Logging adequacy
   - Monitoring hooks
   - Graceful degradation
   - Edge case handling

OUTPUT FORMAT:
- Critical Issues (must fix before deploy)
- Warnings (should fix soon)
- Suggestions (nice to have)
- Positive Highlights (good patterns to keep)

Include specific line numbers and code examples for each issue.`,
    price: 39.99,
    ai_model: 'claude',
    category_ko: '개발',
    category_en: 'Development',
    tags: ['code-review', 'development', 'security', 'performance', 'best-practices'],
  },
];

/**
 * DB Setup Page - One-click database initialization
 * Stitch Design System compliant
 */
export default function AdminSetupPage() {
  const t = useTranslations('admin');
  const [isInitializing, setIsInitializing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, message, type }]);
  };

  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .substring(0, 50) + '-' + Date.now().toString(36);
  };

  const handleInitialize = async () => {
    setIsInitializing(true);
    setIsComplete(false);
    setHasError(false);
    setLogs([]);

    const supabase = createClient();

    try {
      // Step 1: Check authentication
      addLog('Checking authentication...', 'info');
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        addLog('Authentication required. Please log in first.', 'error');
        setHasError(true);
        setIsInitializing(false);
        return;
      }
      addLog(`Authenticated as: ${user.email}`, 'success');

      // Step 2: Check/Create user profile
      addLog('Checking user profile...', 'info');
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', user.id)
        .single();

      if (!existingProfile) {
        addLog('Creating user profile...', 'info');
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            name: user.email?.split('@')[0] || 'Admin',
            role: 'admin',
          });

        if (profileError) {
          addLog(`Profile creation failed: ${profileError.message}`, 'error');
          setHasError(true);
          setIsInitializing(false);
          return;
        }
        addLog('User profile created with admin role', 'success');
      } else {
        addLog(`Profile exists with role: ${existingProfile.role}`, 'success');
        
        // Update to admin if not already
        if (existingProfile.role !== 'admin') {
          addLog('Upgrading to admin role...', 'info');
          await supabase
            .from('profiles')
            .update({ role: 'admin' })
            .eq('id', user.id);
          addLog('Role upgraded to admin', 'success');
        }
      }

      // Step 3: Check for existing sample prompts
      addLog('Checking for existing sample prompts...', 'info');
      const { data: existingPrompts, error: checkError } = await supabase
        .from('prompts')
        .select('id, title_en')
        .eq('user_id', user.id)
        .limit(10);

      if (checkError) {
        addLog(`Database check failed: ${checkError.message}`, 'error');
        setHasError(true);
        setIsInitializing(false);
        return;
      }

      const existingTitles = existingPrompts?.map(p => p.title_en) || [];
      const promptsToInsert = SAMPLE_PROMPTS.filter(
        p => !existingTitles.includes(p.title_en)
      );

      if (promptsToInsert.length === 0) {
        addLog('All sample prompts already exist. Skipping insertion.', 'warning');
      } else {
        // Step 4: Insert sample prompts
        addLog(`Inserting ${promptsToInsert.length} premium sample prompts...`, 'info');

        for (const prompt of promptsToInsert) {
          const slug = generateSlug(prompt.title_en);
          
          const { error: insertError } = await supabase
            .from('prompts')
            .insert({
              user_id: user.id,
              title_ko: prompt.title_ko,
              title_en: prompt.title_en,
              description_ko: prompt.description_ko,
              description_en: prompt.description_en,
              content: prompt.content,
              price: prompt.price,
              ai_model: prompt.ai_model,
              category_ko: prompt.category_ko,
              category_en: prompt.category_en,
              tags: prompt.tags,
              slug: slug,
              status: 'approved',
              views: Math.floor(Math.random() * 500) + 100,
              sales: Math.floor(Math.random() * 50) + 10,
              rating: (Math.random() * 1 + 4).toFixed(1),
              review_count: Math.floor(Math.random() * 20) + 5,
            });

          if (insertError) {
            addLog(`Failed to insert "${prompt.title_en}": ${insertError.message}`, 'error');
            setHasError(true);
          } else {
            addLog(`Inserted: ${prompt.title_en} ($${prompt.price})`, 'success');
          }
        }
      }

      // Step 5: Verify insertion
      addLog('Verifying database state...', 'info');
      const { count } = await supabase
        .from('prompts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      addLog(`Total approved prompts in database: ${count}`, 'success');

      // Complete
      addLog('Database initialization complete!', 'success');
      setIsComplete(true);

    } catch (error) {
      addLog(`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      setHasError(true);
    } finally {
      setIsInitializing(false);
    }
  };

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0" />;
      default:
        return <div className="w-4 h-4 rounded-full bg-gray-600 flex-shrink-0" />;
    }
  };

  const getLogTextColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'text-primary';
      case 'error':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      default:
        return 'text-gray-300';
    }
  };

  return (
    <main className="container mx-auto px-4 py-24 max-w-4xl">
      {/* Page Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/20 rounded-[32px] mb-6">
          <Database className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight mb-4">Database Setup</h1>
        <p className="text-lg text-gray-400 leading-relaxed max-w-2xl mx-auto">
          Initialize your database with premium sample prompts. This will create your admin profile and insert 3 high-quality sample prompts to get started.
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-[#0A0A0A] border border-[#1A1A1A] rounded-[32px] p-8">
        {/* Sample Prompts Preview */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Sample Prompts to be Created</h2>
          <div className="grid gap-4">
            {SAMPLE_PROMPTS.map((prompt, index) => (
              <div
                key={index}
                className="bg-[#1A1A1A] rounded-[24px] p-4 flex items-center justify-between"
              >
                <div>
                  <h3 className="font-medium text-white">{prompt.title_en}</h3>
                  <p className="text-sm text-gray-400">{prompt.ai_model.toUpperCase()} - {prompt.category_en}</p>
                </div>
                <div className="text-2xl font-bold text-primary">
                  ${prompt.price.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Initialize Button */}
        <button
          onClick={handleInitialize}
          disabled={isInitializing || isComplete}
          className="w-full bg-primary hover:bg-primary-600 hover:brightness-110 text-white font-semibold py-4 rounded-[32px] transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          {isInitializing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Initializing Database...
            </>
          ) : isComplete ? (
            <>
              <CheckCircle className="w-5 h-5" />
              Initialization Complete
            </>
          ) : (
            <>
              <Database className="w-5 h-5" />
              Initialize Database
            </>
          )}
        </button>

        {/* Execution Log */}
        {logs.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-medium text-gray-400 mb-3">Execution Log</h3>
            <div className="bg-black border border-[#1A1A1A] rounded-[24px] p-4 max-h-80 overflow-y-auto font-mono text-sm">
              {logs.map((log, index) => (
                <div key={index} className="flex items-start gap-3 py-1">
                  {getLogIcon(log.type)}
                  <span className="text-gray-500 flex-shrink-0">[{log.timestamp}]</span>
                  <span className={getLogTextColor(log.type)}>{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Messages */}
        {isComplete && !hasError && (
          <div className="mt-6 bg-primary/10 border border-primary/30 rounded-[24px] p-4">
            <p className="text-primary font-medium">
              Database initialized successfully! You can now browse the marketplace to see your sample prompts.
            </p>
          </div>
        )}

        {hasError && (
          <div className="mt-6 bg-red-500/10 border border-red-500/30 rounded-[24px] p-4">
            <p className="text-red-400 font-medium">
              Some errors occurred during initialization. Please check the log above for details.
            </p>
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="mt-8 text-center text-sm text-gray-500">
        <p>This page is only accessible to administrators.</p>
        <p className="mt-1">Sample prompts will be created with &quot;approved&quot; status and visible immediately.</p>
      </div>
    </main>
  );
}
