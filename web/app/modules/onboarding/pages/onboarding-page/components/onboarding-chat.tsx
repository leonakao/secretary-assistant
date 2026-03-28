import { useEffect, useRef, useState } from 'react';
import { Bot, LoaderCircle, Send } from 'lucide-react';
import { Button } from '~/components/ui/button';
import {
  sendOnboardingMessage,
  type OnboardingMessage,
} from '../../../api/onboarding.api';
import { useApiClient } from '~/lib/api-client-context';

interface OnboardingChatProps {
  conversation: {
    threadId: string | null;
    messages: OnboardingMessage[];
  };
  onComplete: () => void;
}

export function OnboardingChat({ conversation, onComplete }: OnboardingChatProps) {
  const client = useApiClient();
  const [messages, setMessages] = useState<OnboardingMessage[]>(
    conversation.messages,
  );
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const adjustTextareaHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [input]);

  const handleSend = async () => {
    const message = input.trim();
    if (!message || isSending) return;

    setIsSending(true);
    setError(null);

    const optimisticUserMsg: OnboardingMessage = {
      id: `optimistic-${Date.now()}`,
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticUserMsg]);
    setInput('');
    scrollToBottom();

    try {
      const response = await sendOnboardingMessage({ message }, client);

      const assistantMsg: OnboardingMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.assistantMessage.content,
        createdAt: response.assistantMessage.createdAt,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      scrollToBottom();

      if (response.onboarding.step === 'complete') {
        onComplete();
      }
    } catch (cause) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUserMsg.id));
      setInput(message);
      setError(
        cause instanceof Error ? cause.message : 'Failed to send message. Please try again.',
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10">
              <Bot className="h-6 w-6 text-brand" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Your assistant is ready
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Describe your business — what you do, who your customers are,<br />
                and how you handle service requests.
              </p>
            </div>
            <button
              onClick={() => setInput("Hi! We're a plumbing company and we handle service requests from residential clients.")}
              className="rounded-full border border-border bg-muted/50 px-4 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Try an example →
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-end gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10">
                    <Bot className="h-3.5 w-3.5 text-brand" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                    msg.role === 'user'
                      ? 'rounded-br-sm bg-brand text-white'
                      : 'rounded-bl-sm bg-muted text-foreground'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex items-end gap-2.5 justify-start">
                <div className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand/10">
                  <Bot className="h-3.5 w-3.5 text-brand" />
                </div>
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm text-muted-foreground">
                  <span className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
                  </span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-6 pb-2">
          <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            {error}
          </p>
        </div>
      )}

      {/* Input bar */}
      <div className="border-t border-border bg-background px-6 py-4">
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-muted/30 px-4 py-2 focus-within:border-brand/40 focus-within:ring-2 focus-within:ring-brand/20">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            placeholder="Describe your business..."
            rows={1}
            className="flex-1 resize-none bg-transparent py-1 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
          />
          <Button
            onClick={() => void handleSend()}
            disabled={isSending || !input.trim()}
            size="icon"
            className="mb-0.5 h-8 w-8 shrink-0 rounded-xl"
            aria-label="Send message"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground/60">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
