import { useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Message } from '@/lib/gyeol/types';
import { supabase } from '@/src/lib/supabase';
import { speakText } from '@/lib/gyeol/tts';
import { MessageReactions } from '@/src/components/MessageReactions';
import { ReplyPreview, ReplyBubble } from '@/src/components/MessageReply';
import { FileDropZone, FileAttachmentPreview } from '@/src/components/FileDropZone';
import { LinkPreview, extractUrls } from '@/src/components/LinkPreview';
import { ReadReceipt } from '@/src/components/ReadReceipt';
import { ModelSelector } from '@/src/components/ModelSelector';
import { ContinuousVoiceInput } from '@/src/components/ContinuousVoiceInput';
import { VoiceInput } from '@/components/VoiceInput';
import { Paperclip, ArrowUp, Copy, Volume2, Reply, Pin, X } from 'lucide-react';

interface ChatCoreProps {
  messages: Message[];
  isLoading: boolean;
  agentName: string;
  agentId?: string;
  onSendMessage: (text: string) => Promise<void>;
  onVoiceResult?: (text: string) => void;
  error?: { message: string } | null;
  onClearError?: () => void;
  inputPlaceholder?: string;
  showModelSelector?: boolean;
  showFileAttach?: boolean;
  showContinuousVoice?: boolean;
  readSpeed?: number;
  children?: React.ReactNode;
}

export function ChatCore({
  messages, isLoading, agentName, agentId, onSendMessage, onVoiceResult,
  error, onClearError, inputPlaceholder = 'Send a message...', showModelSelector: showModelSelectorProp = true,
  showFileAttach = true, showContinuousVoice = false, readSpeed = 0.95, children,
}: ChatCoreProps) {
  const [input, setInput] = useState('');
  const [reactions, setReactions] = useState<Record<string, string>>({});
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [replyMap, setReplyMap] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('gyeol_replies_core') ?? '{}'); } catch { return {}; }
  });
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [selectedModel, setSelectedModel] = useState('default');
  const [continuousVoice, setContinuousVoice] = useState(showContinuousVoice);
  const [pinnedMessages, setPinnedMessages] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('gyeol_pinned_core') ?? '[]')); } catch { return new Set(); }
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReaction = useCallback((msgId: string, emoji: string) => {
    setReactions(prev => ({ ...prev, [msgId]: emoji }));
    if (!msgId.startsWith('local-')) {
      supabase.from('gyeol_conversations').update({ reactions: { [emoji]: 1 } } as any).eq('id', msgId);
    }
  }, []);

  const togglePin = useCallback((msgId: string) => {
    setPinnedMessages(prev => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId); else next.add(msgId);
      localStorage.setItem('gyeol_pinned_core', JSON.stringify([...next]));
      return next;
    });
    if (!msgId.startsWith('local-')) {
      supabase.from('gyeol_conversations').update({ is_pinned: !pinnedMessages.has(msgId) }).eq('id', msgId);
    }
  }, [pinnedMessages]);

  const handleFileDrop = useCallback((file: File) => {
    if (file.size > 10 * 1024 * 1024) return;
    setAttachedFile(file);
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading || !agentId) return;
    setInput('');
    if (attachedFile) {
      const fileInfo = `[\u{1F4CE} ${attachedFile.name} (${(attachedFile.size / 1024).toFixed(1)}KB)]`;
      setAttachedFile(null);
      await onSendMessage(fileInfo + '\n' + text);
      return;
    }
    const prefix = replyTo ? `[\u21a9 ${replyTo.role === 'user' ? 'You' : agentName}: "${replyTo.content.slice(0, 40)}..."]\n` : '';
    if (replyTo) {
      const localId = `pending-reply-${Date.now()}`;
      setReplyMap(prev => {
        const next = { ...prev, [localId]: replyTo.id };
        localStorage.setItem('gyeol_replies_core', JSON.stringify(next));
        return next;
      });
      setReplyTo(null);
    }
    await onSendMessage(prefix + text);
  }, [input, isLoading, agentId, attachedFile, replyTo, agentName, onSendMessage]);

  const handleVoiceResult = useCallback((text: string) => {
    if (text.trim()) {
      setInput(prev => (prev ? prev + ' ' + text : text));
      onVoiceResult?.(text);
    }
  }, [onVoiceResult]);

  const renderUrlPreviews = useCallback((content: string) => {
    const urls = extractUrls(content);
    if (urls.length === 0) return null;
    return <div className="mt-1 space-y-1">{urls.slice(0, 2).map(url => <LinkPreview key={url} url={url} />)}</div>;
  }, []);

  const renderMessageActions = useCallback((msg: Message, isUser: boolean) => (
    <div className={`flex gap-0.5 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? 'justify-end' : ''}`}>
      <MessageReactions messageId={msg.id} onReact={handleReaction} currentReaction={reactions[msg.id]} />
      <button onClick={() => navigator.clipboard.writeText(msg.content)} aria-label="Copy"
        className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition text-xs"><Copy size={12} /></button>
      {!isUser && (
        <button onClick={() => speakText(msg.content, readSpeed)} aria-label="Read aloud"
          className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition text-xs"><Volume2 size={12} /></button>
      )}
      <button onClick={() => setReplyTo(msg)} aria-label="Reply"
        className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted transition text-xs"><Reply size={12} /></button>
      <button onClick={() => togglePin(msg.id)} aria-label={pinnedMessages.has(msg.id) ? 'Unpin' : 'Pin'}
        className={`p-1 rounded-md transition text-xs ${pinnedMessages.has(msg.id) ? 'text-warning' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}>
        <Pin size={12} />
      </button>
    </div>
  ), [handleReaction, reactions, readSpeed, togglePin, pinnedMessages]);

  const pinnedList = useMemo(() => messages.filter(m => pinnedMessages.has(m.id)), [messages, pinnedMessages]);

  return (
    <FileDropZone onFileDrop={handleFileDrop} accept="image/*,.pdf,.doc,.docx,.txt" disabled={isLoading}>
      <div className="flex flex-col h-full">
        {children}

        {pinnedList.length > 0 && (
          <div className="mx-3 mb-2 p-2.5 rounded-lg bg-warning/5 border border-warning/20 sticky top-0 z-20">
            <div className="flex items-center gap-1.5 mb-1">
              <Pin size={12} className="text-warning" />
              <span className="text-[10px] text-warning font-medium">Pinned ({pinnedList.length})</span>
            </div>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {pinnedList.map(m => (
                <div key={`pin-${m.id}`} className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                  <span className="font-medium">{m.role === 'user' ? 'You' : agentName}:</span>
                  <span className="truncate">{m.content.slice(0, 60)}</span>
                  <button onClick={() => togglePin(m.id)} className="ml-auto text-muted-foreground hover:text-warning shrink-0"><X size={10} /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 space-y-1 gyeol-scrollbar-hide pb-44 pt-2" role="log" aria-label="Messages">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const time = new Date(msg.created_at ?? Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'} w-full group py-1`}>

                {isUser ? (
                  <div className="max-w-[80%]">
                    {replyMap[msg.id] && <ReplyBubble originalMessage={messages.find(m => m.id === replyMap[msg.id])} agentName={agentName} />}
                    <div className="flex items-center justify-end gap-2 mb-0.5">
                      <span className="text-[10px] text-muted-foreground">{time}</span>
                    </div>
                    <div className={`bg-primary text-primary-foreground px-4 py-2.5 rounded-2xl rounded-br-md ${pinnedMessages.has(msg.id) ? 'ring-1 ring-warning/40' : ''}`}>
                      <div className="text-[13px] leading-relaxed whitespace-pre-wrap break-words">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                    {renderUrlPreviews(msg.content)}
                    <div className="flex justify-end mt-0.5">
                      <ReadReceipt sent={true} read={messages.some(m => m.role === 'assistant' && new Date(m.created_at) > new Date(msg.created_at))} />
                    </div>
                    {renderMessageActions(msg, true)}
                  </div>
                ) : (
                  <div className="max-w-[85%]">
                    {replyMap[msg.id] && <ReplyBubble originalMessage={messages.find(m => m.id === replyMap[msg.id])} agentName={agentName} />}
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold text-foreground">{agentName}</span>
                      <span className="text-[10px] text-muted-foreground">{time}</span>
                    </div>
                    <div className={`bg-muted px-4 py-2.5 rounded-2xl rounded-tl-md ${pinnedMessages.has(msg.id) ? 'ring-1 ring-warning/40' : ''}`}>
                      <div className="text-[13px] leading-relaxed text-foreground whitespace-pre-wrap break-words prose prose-sm max-w-none prose-p:my-1 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                    {renderUrlPreviews(msg.content)}
                    {renderMessageActions(msg, false)}
                  </div>
                )}
              </motion.div>
            );
          })}

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center py-2">
              <button type="button" onClick={onClearError}
                className="text-xs text-destructive bg-destructive/10 px-3 py-1.5 rounded-lg hover:bg-destructive/20 transition">
                {error.message}
              </button>
            </motion.div>
          )}

          {isLoading && (
            <div className="flex items-center gap-2 py-3 px-1">
              <div className="flex gap-1">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
              <span className="text-[11px] text-muted-foreground">{agentName} is typing...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <div className="fixed bottom-0 left-0 right-0 z-[75] px-3 pt-2 pb-[calc(60px+env(safe-area-inset-bottom,8px))] bg-gradient-to-t from-background via-background to-transparent">
          <AnimatePresence>
            {replyTo && <ReplyPreview replyTo={replyTo} onClear={() => setReplyTo(null)} />}
          </AnimatePresence>
          <AnimatePresence>
            {attachedFile && (
              <div className="mb-2"><FileAttachmentPreview file={attachedFile} onRemove={() => setAttachedFile(null)} /></div>
            )}
          </AnimatePresence>
          {showModelSelectorProp && (
            <div className="flex items-center gap-2 mb-1.5">
              <ModelSelector currentModel={selectedModel} onSelect={setSelectedModel} />
            </div>
          )}
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-2 py-1.5 input-glow">
            {showFileAttach && (
              <>
                <input type="file" ref={fileInputRef} accept="image/*,.pdf,.doc,.docx,.txt" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setAttachedFile(f); }} />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition flex-shrink-0"
                  aria-label="Attach file">
                  <Paperclip size={18} />
                </button>
              </>
            )}
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={inputPlaceholder} aria-label="Message input"
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground text-sm py-2 outline-none min-w-0" />
            {continuousVoice ? (
              <ContinuousVoiceInput onResult={t => setInput(prev => prev + t)} disabled={isLoading} />
            ) : (
              <VoiceInput onResult={handleVoiceResult} disabled={!agentId} />
            )}
            <button type="button" onClick={handleSend} disabled={!input.trim() || isLoading} aria-label="Send message"
              className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 transition-all active:scale-95 flex-shrink-0">
              <ArrowUp size={16} />
            </button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground/60 mt-1">
            GYEOL can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </FileDropZone>
  );
}
