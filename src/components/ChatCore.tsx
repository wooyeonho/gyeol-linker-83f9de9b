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
  messages,
  isLoading,
  agentName,
  agentId,
  onSendMessage,
  onVoiceResult,
  error,
  onClearError,
  inputPlaceholder = 'Send a message...',
  showModelSelector: showModelSelectorProp = true,
  showFileAttach = true,
  showContinuousVoice = false,
  readSpeed = 0.95,
  children,
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
    return (
      <div className="mt-1 space-y-1">
        {urls.slice(0, 2).map(url => <LinkPreview key={url} url={url} />)}
      </div>
    );
  }, []);

  const renderMessageActions = useCallback((msg: Message, isUser: boolean) => (
    <div className={`flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? 'justify-end' : ''}`}>
      <MessageReactions messageId={msg.id} onReact={handleReaction} currentReaction={reactions[msg.id]} />
      <button onClick={() => navigator.clipboard.writeText(msg.content)}
        aria-label="Copy message"
        className="text-[9px] text-muted-foreground/40 hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/10 transition">
        <span aria-hidden="true" className="material-icons-round text-[12px]">content_copy</span>
      </button>
      {!isUser && (
        <button onClick={() => speakText(msg.content, readSpeed)}
          aria-label="Read aloud"
          className="text-[9px] text-muted-foreground/40 hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/10 transition">
          <span aria-hidden="true" className="material-icons-round text-[12px]">volume_up</span>
        </button>
      )}
      <button onClick={() => setReplyTo(msg)}
        aria-label="Reply"
        className="text-[9px] text-muted-foreground/40 hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/10 transition">
        <span aria-hidden="true" className="material-icons-round text-[12px]">reply</span>
      </button>
      <button onClick={() => togglePin(msg.id)}
        aria-label={pinnedMessages.has(msg.id) ? 'Unpin' : 'Pin'}
        className={`text-[9px] px-1.5 py-0.5 rounded transition ${pinnedMessages.has(msg.id) ? 'text-[hsl(var(--warning))]' : 'text-muted-foreground/40 hover:text-[hsl(var(--warning))] hover:bg-[hsl(var(--warning)/0.1)]'}`}>
        <span aria-hidden="true" className="material-icons-round text-[12px]">push_pin</span>
      </button>
    </div>
  ), [handleReaction, reactions, readSpeed, togglePin, pinnedMessages]);

  const pinnedList = useMemo(() =>
    messages.filter(m => pinnedMessages.has(m.id)),
  [messages, pinnedMessages]);

  return (
    <FileDropZone onFileDrop={handleFileDrop} accept="image/*,.pdf,.doc,.docx,.txt" disabled={isLoading}>
      <div className="flex flex-col h-full">
        {children}

        {pinnedList.length > 0 && (
          <div className="mx-3 mb-2 p-2 rounded-xl glass-card border border-[hsl(var(--warning))]/20 sticky top-0 z-20 backdrop-blur-md">
            <div className="flex items-center gap-1 mb-1">
              <span aria-hidden="true" className="material-icons-round text-[hsl(var(--warning))] text-[12px]">push_pin</span>
              <span className="text-[10px] text-[hsl(var(--warning))] font-medium">Pinned ({pinnedList.length})</span>
            </div>
            <div className="space-y-1 max-h-20 overflow-y-auto">
              {pinnedList.map(m => (
                <div key={`pin-${m.id}`} className="text-[10px] text-foreground/60 truncate flex items-center gap-1">
                  <span className={m.role === 'user' ? 'text-primary/50' : 'text-secondary/50'}>{m.role === 'user' ? 'You' : agentName}:</span>
                  <span className="truncate">{m.content.slice(0, 60)}</span>
                  <button onClick={() => togglePin(m.id)} className="ml-auto text-[hsl(var(--warning))]/50 hover:text-[hsl(var(--warning))] shrink-0">
                    <span aria-hidden="true" className="material-icons-round text-[10px]">close</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-3 space-y-3 gyeol-scrollbar-hide pb-2 pt-2" role="log" aria-label="Messages">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const time = new Date(msg.created_at ?? Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} w-full group`}
              >
                {!isUser && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary p-[1px] shadow-lg shadow-primary/10 mt-6">
                    <div className="w-full h-full rounded-[7px] bg-background flex items-center justify-center">
                      <span aria-hidden="true" className="material-icons-round text-transparent bg-clip-text bg-gradient-to-br from-primary to-secondary text-[14px]">smart_toy</span>
                    </div>
                  </div>
                )}

                {isUser ? (
                  <div className="max-w-[75%]">
                    {replyMap[msg.id] && (
                      <ReplyBubble originalMessage={messages.find(m => m.id === replyMap[msg.id])} agentName={agentName} />
                    )}
                    <div className="flex items-center justify-end gap-2 mb-1">
                      <span className="text-[10px] text-muted-foreground/60">{time}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">You</span>
                    </div>
                    <div className={`user-bubble p-4 rounded-2xl rounded-br-sm ${pinnedMessages.has(msg.id) ? 'ring-1 ring-amber-400/30' : ''}`}>
                      <div className="text-[13px] leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
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
                    {replyMap[msg.id] && (
                      <ReplyBubble originalMessage={messages.find(m => m.id === replyMap[msg.id])} agentName={agentName} />
                    )}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] text-foreground font-bold">{agentName}</span>
                      <span className="text-[10px] text-muted-foreground/60">{time}</span>
                    </div>
                    <div className="flex gap-0">
                      <div className="w-[3px] rounded-full bg-gradient-to-b from-primary to-primary/30 mr-3 flex-shrink-0" />
                      <div className={`glass-bubble p-4 rounded-2xl rounded-tl-sm flex-1 ${pinnedMessages.has(msg.id) ? 'ring-1 ring-amber-400/30' : ''}`}>
                        <div className="text-[13px] leading-relaxed text-foreground/80 whitespace-pre-wrap break-words prose prose-invert max-w-none prose-p:my-1 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                    {renderUrlPreviews(msg.content)}
                    {renderMessageActions(msg, false)}
                  </div>
                )}

                {isUser && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-secondary/30 to-primary/20 border border-border/20 flex items-center justify-center mt-6">
                    <span aria-hidden="true" className="material-icons-round text-muted-foreground text-[14px]">person</span>
                  </div>
                )}
              </motion.div>
            );
          })}

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-center py-2">
              <button type="button" onClick={onClearError}
                className="text-[11px] text-destructive/70 hover:text-destructive transition">
                {error.message}
              </button>
            </motion.div>
          )}

          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2 py-4">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-primary/40 animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" style={{ animationDelay: '0.4s' }} />
                </div>
                <span className="text-[10px] text-primary/60 font-medium tracking-[0.2em] uppercase">Processing</span>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="relative z-[60] px-4 pt-2 pb-2">
          <AnimatePresence>
            {replyTo && <ReplyPreview replyTo={replyTo} onClear={() => setReplyTo(null)} />}
          </AnimatePresence>
          <AnimatePresence>
            {attachedFile && (
              <div className="mb-2">
                <FileAttachmentPreview file={attachedFile} onRemove={() => setAttachedFile(null)} />
              </div>
            )}
          </AnimatePresence>
          {showModelSelectorProp && (
            <div className="flex items-center gap-2 mb-1.5">
              <ModelSelector currentModel={selectedModel} onSelect={setSelectedModel} />
              <span className="text-[9px] text-muted-foreground/40">
                {messages.length * 150 > 0 ? `${(messages.length * 150).toLocaleString()} tokens` : ''}
              </span>
            </div>
          )}
          <div className="glass-panel input-glow flex items-center gap-2 rounded-full px-2 py-1.5">
            {showFileAttach && (
              <>
                <input type="file" ref={fileInputRef} accept="image/*,.pdf,.doc,.docx,.txt" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setAttachedFile(f); }} />
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition flex-shrink-0"
                  aria-label="Attach file">
                  <span aria-hidden="true" className="material-icons-round text-[20px]">attach_file</span>
                </button>
              </>
            )}
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={inputPlaceholder}
              aria-label="Message input"
              className="flex-1 bg-transparent text-foreground/90 placeholder:text-muted-foreground text-sm py-2 outline-none min-w-0 focus-visible:outline-none"
            />
            {continuousVoice ? (
              <ContinuousVoiceInput onResult={t => setInput(prev => prev + t)} disabled={isLoading} />
            ) : (
              <VoiceInput onResult={handleVoiceResult} disabled={!agentId} />
            )}
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
              className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary shadow-lg shadow-primary/30 text-primary-foreground flex items-center justify-center disabled:opacity-20 transition-all active:scale-95 hover:shadow-primary/50 hover:scale-105 flex-shrink-0"
            >
              <span aria-hidden="true" className="material-icons-round text-base">arrow_upward</span>
            </button>
          </div>
          <p className="text-center text-[11px] text-muted-foreground mt-1.5">
            GYEOL can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </FileDropZone>
  );
}
