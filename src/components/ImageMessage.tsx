import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  src: string;
  alt?: string;
}

export function ImageMessage({ src, alt = 'Shared image' }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <img
        src={src}
        alt={alt}
        onClick={() => setExpanded(true)}
        className="max-w-[200px] max-h-[200px] rounded-xl object-cover cursor-pointer hover:opacity-90 transition border border-border/20"
        loading="lazy"
      />
      <AnimatePresence>
        {expanded && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[80]" onClick={() => setExpanded(false)} />
            <motion.img initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              src={src} alt={alt}
              className="fixed inset-4 z-[80] m-auto max-w-full max-h-full object-contain rounded-2xl"
              onClick={() => setExpanded(false)} />
          </>
        )}
      </AnimatePresence>
    </>
  );
}
