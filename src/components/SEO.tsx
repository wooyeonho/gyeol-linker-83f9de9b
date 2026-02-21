import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

export function usePageSEO({ title, description, image, url }: SEOProps) {
  useEffect(() => {
    const fullTitle = title ? title + ' | GYEOL' : 'GYEOL - AI Companion';
    const desc = description || 'Your AI companion that grows with you.';
    const img = image || '/og-image.png';
    const pageUrl = url || window.location.href;
    document.title = fullTitle;
    const setMeta = (name: string, content: string, attr = 'name') => {
      let el = document.querySelector('meta[' + attr + '="' + name + '"]') as HTMLMetaElement;
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.content = content;
    };
    setMeta('description', desc);
    setMeta('og:title', fullTitle, 'property');
    setMeta('og:description', desc, 'property');
    setMeta('og:image', img, 'property');
    setMeta('og:url', pageUrl, 'property');
    setMeta('og:type', 'website', 'property');
    setMeta('og:site_name', 'GYEOL', 'property');
    setMeta('twitter:card', 'summary_large_image', 'name');
    setMeta('twitter:title', fullTitle, 'name');
    setMeta('twitter:description', desc, 'name');
    setMeta('twitter:image', img, 'name');
  }, [title, description, image, url]);
}

export function JsonLdSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'GYEOL',
    description: 'AI companion that grows with you through conversations and evolution.',
    url: 'https://gyeol.app',
    applicationCategory: 'SocialNetworkingApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
    author: { '@type': 'Organization', name: 'GYEOL Inc.' },
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />;
}
