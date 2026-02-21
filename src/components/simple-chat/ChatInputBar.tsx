import { AnimatePresence } from 'framer-motion';
import { VoiceInput } from '@/components/VoiceInput';
import { VoiceRecorder } from '@/src/components/VoiceRecorder';
import { ReplyPreview } from '@/src/components/MessageReply';
import { FileAttachmentPreview } from '@/src/components/FileDropZone';
import { ModelSelector } from '@/src/components/ModelSelector';
import { ContinuousVoiceInput } from '@/src/components/ContinuousVoiceInput';
import type { SimpleChatState } from '@/src/hooks/useSimpleChatState';

interface ChatInputBarProps {
  state: SimpleChatState;
}

export function ChatInputBar({ state }: ChatInputBarProps) {
  const {
    input, setInput, isLoading, handleSend,
    imageInputRef, handleImageSelect, imagePreview, setImagePreview,
    replyTo, setReplyTo, attachedFile, setAttachedFile,
    selectedModel, setSelectedModel, messages,
    showTokenUsage, setShowTokenUsage, showProviderPanel, setShowProviderPanel,
    maxTokens, continuousVoice,
    voiceMessages, setVoiceMessages, sendMessage,
  } = state;

  return (
    <div className="flex-shrink-0 relative z-10"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)' }}>
      <div className="bg-gradient-to-t from-background to-transparent pt-6 px-4">
        <AnimatePresence>
          {replyTo && <ReplyPreview replyTo={replyTo} onClear={() => setReplyTo(null)} />}
        </AnimatePresence>
        {imagePreview && (
          <div className="mb-2 relative inline-block">
            <img src={imagePreview} alt="Preview" className="w-20 h-20 object-cover rounded-xl border border-primary/20" />
            <button onClick={() => setImagePreview(null)} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-primary-foreground text-[10px] flex items-center justify-center">✕</button>
          </div>
        )}
        <AnimatePresence>
          {attachedFile && (
            <div className="mb-2">
              <FileAttachmentPreview file={attachedFile} onRemove={() => setAttachedFile(null)} />
            </div>
          )}
        </AnimatePresence>
        <div className="flex items-center gap-2 mb-1.5">
          <ModelSelector currentModel={selectedModel} onSelect={setSelectedModel} />
          <button onClick={() => setShowTokenUsage(true)}
            className="text-[9px] text-muted-foreground/40 hover:text-muted-foreground transition px-2 py-1 rounded-full glass-card">
            {messages.length * 150 > 0 ? `${(messages.length * 150).toLocaleString()} tokens` : 'Token usage'}
          </button>
          <button onClick={() => setShowProviderPanel(true)}
            className="text-[9px] text-muted-foreground/40 hover:text-muted-foreground transition px-1.5 py-1 rounded-full glass-card"
            aria-label="Provider settings">
            <span className="material-icons-round text-[12px]">tune</span>
          </button>
        </div>
        <div className="glass-panel input-glow flex items-center gap-2 rounded-full px-2 py-1.5">
          <input type="file" ref={imageInputRef} accept="image/*" className="hidden" onChange={handleImageSelect} />
          <button type="button" onClick={() => imageInputRef.current?.click()}
            className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition flex-shrink-0">
            <span className="material-icons-round text-[20px]">add_photo_alternate</span>
          </button>
          <input type="text" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Message GYEOL..."
            aria-label="Message input"
            style={{ fontSize: '16px' }}
            className="flex-1 bg-transparent outline-none min-w-0 text-foreground placeholder:text-muted-foreground focus-visible:outline-none" />
          {continuousVoice ? (
            <ContinuousVoiceInput onResult={t => { setInput(prev => prev + t); }} disabled={isLoading} />
          ) : (
            <>
              <VoiceRecorder onRecorded={(url, dur) => {
                const id = `voice-${Date.now()}`;
                setVoiceMessages(prev => ({ ...prev, [id]: { url, duration: dur } }));
                sendMessage(`[🎤 Voice message (${dur}s)]`);
              }} disabled={isLoading} />
              <VoiceInput onResult={t => setInput(t)} disabled={isLoading} />
            </>
          )}
          {input.trim() && (
            <button onClick={handleSend} disabled={isLoading}
              aria-label="Send message"
              className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-indigo-600 shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 flex items-center justify-center flex-shrink-0 transition-all focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2">
              <span className="material-icons-round text-primary-foreground text-base" aria-hidden="true">arrow_upward</span>
            </button>
          )}
        </div>
        <p className="text-center text-[9px] text-muted-foreground/40 mt-1.5">
          GYEOL can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
