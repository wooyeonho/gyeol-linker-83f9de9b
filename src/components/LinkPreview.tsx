import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink, Globe } from 'lucide-react';

interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
}

interface Props {
  url: string;
}

export function LinkPreview({ url }: Props) {
  const [data, setData] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    const fetchPreview = async () => {
      try {
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
        if (!res.ok) throw new Error('fetch failed');
        const json = await res.json();
        if (!cancelled) setData({ url, ...json });
      } catch {
        if (!cancelled) {
          setData({ url, title: new URL(url).hostname });
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchPreview();
    return () => { cancelled = true; };
  }, [url]);

  if (loading) {
    return (
      <div className="mt-1 rounded-xl bg-muted/20 border border-border/20 p-3 animate-pulse">
        <div className="h-3 w-32 rounded bg-muted/30 mb-1" />
        <div className="h-2 w-48 rounded bg-muted/20" />
      </div>
    );
  }

  return (
    <motion.a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-1 flex gap-3 rounded-xl bg-muted/10 border border-border/20 p-3 hover:bg-muted/20 transition group no-underline"
    >
      {data?.image && (
        <img src={data.image} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" loading="lazy" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Globe className="w-3 h-3 text-muted-foreground flex-shrink-0" />
          <span className="text-[9px] text-muted-foreground truncate">{new URL(url).hostname}</span>
        </div>
        <p className="text-[11px] font-medium text-foreground truncate">{data?.title ?? url}</p>
        {data?.description && (
          <p className="text-[9px] text-muted-foreground line-clamp-2 mt-0.5">{data.description}</p>
        )}
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary flex-shrink-0 mt-1 transition" />
    </motion.a>
  );
}

export function extractUrls(text: string): string[] {
  const regex = /(https?:\/\/[^\s]+)/g;
  return Array.from(text.matchAll(regex)).map(m => m[0]);
}
