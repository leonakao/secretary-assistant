import { useRef, useState } from 'react';
import { LoaderCircle, Send } from 'lucide-react';
import { Button } from '~/components/ui/base/button';
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

  const scrollToBottom = () => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

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
    <div className="flex h-full flex-col gap-4">
      <div className="flex-1 space-y-4 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            Your assistant is ready. Say hello to get started.
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                  msg.role === 'user'
                    ? 'bg-brand text-white'
                    : 'bg-muted text-foreground'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
        {isSending ? (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              Typing...
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {error ? (
        <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSending}
          placeholder="Type your message..."
          rows={2}
          className="flex-1 resize-none rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/50 disabled:opacity-50"
        />
        <Button
          onClick={() => void handleSend()}
          disabled={isSending || !input.trim()}
          size="icon"
          className="h-auto self-end"
          aria-label="Send message"
        >
          {isSending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
