import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Image, File } from 'lucide-react';

interface Props {
  onFileDrop: (file: File) => void;
  children: React.ReactNode;
  accept?: string;
  disabled?: boolean;
}

export function FileDropZone({ onFileDrop, children, accept, disabled }: Props) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) onFileDrop(file);
  }, [onFileDrop, disabled]);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative"
    >
      {children}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl border-2 border-dashed border-primary/50"
          >
            <div className="text-center">
              <Upload className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">Drop file here</p>
              <p className="text-[10px] text-muted-foreground mt-1">Images, PDF, documents</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FileAttachmentPreview({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImage = file.type.startsWith('image/');
  const [preview, setPreview] = useState<string | null>(null);

  if (isImage && !preview) {
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  const Icon = isImage ? Image : file.type.includes('pdf') ? FileText : File;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/20 border border-border/20"
    >
      {preview ? (
        <img src={preview} alt={file.name} className="w-10 h-10 rounded-lg object-cover" />
      ) : (
        <Icon className="w-5 h-5 text-primary" />
      )}
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-foreground truncate max-w-[120px]">{file.name}</p>
        <p className="text-[8px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
      </div>
      <button
        onClick={onRemove}
        className="w-5 h-5 rounded-full bg-destructive/20 text-destructive flex items-center justify-center text-[10px] hover:bg-destructive/30 transition"
      >
        ✕
      </button>
    </motion.div>
  );
}
