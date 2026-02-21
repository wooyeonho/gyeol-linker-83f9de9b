import { useState } from 'react';
import type { Message } from '@/lib/gyeol/types';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { speakText } from '@/lib/gyeol/tts';
import { ReplyBubble } from '@/src/components/MessageReply';
import { ImageMessage } from '@/src/components/ImageMessage';
import { ReadReceipt } from '@/src/components/ReadReceipt';
import { LinkPreview, extractUrls } from '@/src/components/LinkPreview';
import { MessageReactions } from '@/src/components/MessageReactions';
import { TRANSLATE_LANGS } from '@/src/hooks/useSimpleChatState';
import type { SimpleChatState } from '@/src/hooks/useSimpleChatState';

function CodeBlockCopy({ children, className }: any) {
  const code = String(children).replace(/\n$/, '');
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative group/code">
      <pre className={className}><code>{children}</code></pre>
      <button
        onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        className="absolute top-1 right-1 opacity-0 group-hover/code:opacity-100 transition text-[9px] px-2 py-1 rounded-md bg-primary/20 text-primary hover:bg-primary/30"
      >{copied ? '✓' : 'Copy'}</button>
    </div>
  );
}

interface MessageBubbleProps {
  msg: Message;
  state: SimpleChatState;
}

export function MessageBubble({ msg, state }: MessageBubbleProps) {
  const {
    agentName, fontSize, settings, messages,
    reactions, handleReaction, toggleBookmark, bookmarks,
    togglePin, pinnedMessages, tags, tagInput, setTagInput,
    tagText, setTagText, addTag, removeTag,
    editingMsg, setEditingMsg, editText, setEditText,
    editedMessages, handleEditMessage, handleDeleteMessage,
    setReplyTo, translatePickerFor, setTranslatePickerFor,
    handleTranslate, translations, translating,
    replyMap, imagePreview,
  } = state;

  const isUser = msg.role === 'user';

  const renderMessageActions = () => (
    <div className={`flex gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity ${isUser ? 'justify-end' : ''}`}>
      <MessageReactions messageId={msg.id} onReact={handleReaction} currentReaction={reactions[msg.id]} />
      {isUser && (
        <button onClick={() => { setEditingMsg(msg.id); setEditText(msg.content); }}
          aria-label="Edit message"
          className="text-[9px] text-muted-foreground hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/10 transition">
          <span className="material-icons-round text-[12px]">edit</span>
        </button>
      )}
      <button onClick={() => handleDeleteMessage(msg.id)}
        aria-label="Delete message"
        className="text-[9px] text-muted-foreground hover:text-destructive px-1.5 py-0.5 rounded hover:bg-destructive/10 transition">
        <span className="material-icons-round text-[12px]">delete</span>
      </button>
      <button onClick={() => navigator.clipboard.writeText(msg.content)}
        aria-label="Copy message"
        className="text-[9px] text-muted-foreground hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/10 transition">
        <span className="material-icons-round text-[12px]">content_copy</span>
      </button>
      {!isUser && (
        <button onClick={() => speakText(msg.content, settings.readSpeed ?? 0.95)}
          aria-label="Read aloud"
          className="text-[9px] text-muted-foreground hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/10 transition">
          <span className="material-icons-round text-[12px]">volume_up</span>
        </button>
      )}
      {!isUser && (
        <button onClick={() => setTranslatePickerFor(translatePickerFor === msg.id ? null : msg.id)}
          aria-label="Translate"
          className="text-[9px] text-muted-foreground hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/10 transition">
          <span className="material-icons-round text-[12px]">translate</span>
        </button>
      )}
      <button onClick={() => setReplyTo(msg)}
        aria-label="Reply"
        className="text-[9px] text-muted-foreground hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/10 transition">
        <span className="material-icons-round text-[12px]">reply</span>
      </button>
      <button onClick={() => togglePin(msg.id)}
        aria-label={pinnedMessages.has(msg.id) ? 'Unpin' : 'Pin'}
        className={`text-[9px] px-1.5 py-0.5 rounded transition ${pinnedMessages.has(msg.id) ? 'text-amber-400' : 'text-muted-foreground hover:text-amber-400 hover:bg-amber-400/10'}`}>
        <span className="material-icons-round text-[12px]">push_pin</span>
      </button>
      <button onClick={() => setTagInput(tagInput === msg.id ? null : msg.id)}
        aria-label="Add tag"
        className="text-[9px] text-muted-foreground hover:text-primary px-1.5 py-0.5 rounded hover:bg-primary/10 transition">
        <span className="material-icons-round text-[12px]">label</span>
      </button>
      <button onClick={() => toggleBookmark(msg.id)}
        aria-label={bookmarks.has(msg.id) ? 'Remove bookmark' : 'Bookmark'}
        className={`text-[9px] px-1.5 py-0.5 rounded transition ${bookmarks.has(msg.id) ? 'text-amber-400' : 'text-muted-foreground hover:text-amber-400 hover:bg-amber-400/10'}`}>
        <span className="material-icons-round text-[12px]">{bookmarks.has(msg.id) ? 'bookmark' : 'bookmark_border'}</span>
      </button>
    </div>
  );

  const renderUrlPreviews = (content: string) => {
    const urls = extractUrls(content);
    if (urls.length === 0) return null;
    return (
      <div className="mt-1 space-y-1">
        {urls.slice(0, 2).map(url => <LinkPreview key={url} url={url} />)}
      </div>
    );
  };

  const renderTagsAndExtras = () => (
    <>
      {(tags[msg.id] ?? []).length > 0 && (
        <div className={`flex flex-wrap gap-1 mt-1 ${isUser ? 'justify-end' : ''}`}>
          {(tags[msg.id] ?? []).map(t => (
            <span key={t} className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary/60 flex items-center gap-0.5">
              #{t}
              <button onClick={() => removeTag(msg.id, t)} className="text-primary/30 hover:text-primary">×</button>
            </span>
          ))}
        </div>
      )}
      <AnimatePresence>
        {tagInput === msg.id && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className={`flex gap-1 mt-1 overflow-hidden ${isUser ? 'justify-end' : ''}`}>
            <input type="text" value={tagText} onChange={e => setTagText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTag(msg.id, tagText)}
              placeholder="tag name" maxLength={20}
              className="w-24 rounded-full bg-secondary/50 border border-border/30 px-2 py-1 text-[9px] text-foreground outline-none" autoFocus />
            <button onClick={() => addTag(msg.id, tagText)}
              className="text-[9px] px-2 py-1 rounded-full bg-primary/10 text-primary">Add</button>
          </motion.div>
        )}
      </AnimatePresence>
      {!isUser && translating === msg.id && (
        <div className="text-[10px] text-muted-foreground mt-1 animate-pulse">번역 중...</div>
      )}
      {!isUser && translations[msg.id] && (
        <div className="mt-1 p-2 rounded-lg bg-primary/5 border border-primary/10 text-[11px] text-foreground/80">
          {translations[msg.id]}
        </div>
      )}
      {!isUser && (
        <AnimatePresence>
          {translatePickerFor === msg.id && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="flex gap-1 mt-1 flex-wrap">
              {TRANSLATE_LANGS.map(l => (
                <button key={l.code} onClick={() => handleTranslate(msg.id, msg.content, l.code)}
                  className="text-[9px] px-2 py-1 rounded-full glass-card hover:bg-primary/10 text-muted-foreground hover:text-primary transition">{l.label}</button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </>
  );

  if (isUser) {
    return (
      <div className={`flex mb-3 justify-end group`}>
        <div className="flex gap-2.5 justify-end">
          <div className="max-w-[80%]">
            {replyMap[msg.id] && (
              <ReplyBubble originalMessage={messages.find(m => m.id === replyMap[msg.id])} agentName={agentName} />
            )}
            <span className="text-[10px] text-muted-foreground font-medium mr-1 mb-1 block text-right">
              You · {format(new Date(msg.created_at), 'HH:mm')}
              {editedMessages.has(msg.id) && <span className="ml-1 text-muted-foreground/40">(수정됨)</span>}
            </span>
            <div className={`user-bubble p-4 rounded-2xl rounded-br-sm ${pinnedMessages.has(msg.id) ? 'ring-1 ring-amber-400/30' : ''}`}
              style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}>
              {editingMsg === msg.id ? (
                <div className="space-y-2">
                  <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={2}
                    className="w-full bg-background/50 rounded-lg px-2 py-1 text-sm outline-none border border-primary/20 resize-none" autoFocus />
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => setEditingMsg(null)} className="text-[9px] px-2 py-1 rounded text-muted-foreground">Cancel</button>
                    <button onClick={() => handleEditMessage(msg.id)} className="text-[9px] px-2 py-1 rounded bg-primary/20 text-primary">Save</button>
                  </div>
                </div>
              ) : msg.content.startsWith('[') && msg.content.includes('📷') && imagePreview ? (
                <ImageMessage src={imagePreview} alt="Sent image" />
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              )}
            </div>
            {renderUrlPreviews(msg.content)}
            <div className="flex justify-end mt-0.5">
              <ReadReceipt sent={true} read={msg.role === 'user' && messages.some(m => m.role === 'assistant' && new Date(m.created_at) > new Date(msg.created_at))} />
            </div>
            {renderTagsAndExtras()}
            {renderMessageActions()}
          </div>
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-secondary/30 to-primary/20 border border-foreground/10 flex items-center justify-center shadow-lg mt-5">
            <span className="material-icons-round text-muted-foreground text-[14px]">person</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex mb-3 justify-start group`}>
      <div className="flex gap-2.5 justify-start">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-secondary/20 border border-foreground/10 flex items-center justify-center shadow-lg mt-5">
          <span className="material-icons-round text-primary/80 text-[14px]">smart_toy</span>
        </div>
        <div className="max-w-[80%]">
          <span className="text-[10px] text-primary/60 font-medium ml-1 mb-1 block">{agentName} · {format(new Date(msg.created_at), 'HH:mm')}</span>
          <div className="glass-bubble p-4 rounded-2xl rounded-bl-sm"
            style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}>
            <div className="prose prose-invert max-w-none prose-p:my-1 prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ pre: CodeBlockCopy }}>{msg.content}</ReactMarkdown>
            </div>
          </div>
          {renderUrlPreviews(msg.content)}
          {renderTagsAndExtras()}
          {renderMessageActions()}
        </div>
      </div>
    </div>
  );
}
