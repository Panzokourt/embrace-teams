import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Props {
  onAsk: (question: string) => void;
  answer: string;
  isLoading: boolean;
}

export function KBAskChat({ onAsk, answer, isLoading }: Props) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [answer, history]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    const q = input.trim();
    setHistory(prev => [...prev, { role: 'user', content: q }]);
    setInput('');
    onAsk(q);
  };

  // When answer finalizes, push it to history
  useEffect(() => {
    if (!isLoading && answer) {
      setHistory(prev => [...prev, { role: 'assistant', content: answer }]);
    }
  }, [isLoading]);

  return (
    <div className="flex flex-col h-[500px]">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 p-4">
        {history.length === 0 && !answer && (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Bot className="h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm">Ρωτήστε οτιδήποτε σχετικά με το Wiki σας.</p>
            <p className="text-xs mt-1">Το AI θα απαντήσει βάσει των αποθηκευμένων άρθρων σας.</p>
          </div>
        )}
        {history.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && <Bot className="h-5 w-5 mt-1 text-primary shrink-0" />}
            <Card className={`max-w-[80%] ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : ''}`}>
              <CardContent className="p-3 text-sm">
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}
              </CardContent>
            </Card>
            {msg.role === 'user' && <User className="h-5 w-5 mt-1 text-muted-foreground shrink-0" />}
          </div>
        ))}
        {isLoading && answer && (
          <div className="flex gap-2 justify-start">
            <Bot className="h-5 w-5 mt-1 text-primary shrink-0" />
            <Card>
              <CardContent className="p-3 text-sm prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{answer}</ReactMarkdown>
              </CardContent>
            </Card>
          </div>
        )}
        {isLoading && !answer && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Σκέφτεται...
          </div>
        )}
      </div>
      <div className="border-t p-3 flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ρωτήστε κάτι για το Wiki..."
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          disabled={isLoading}
        />
        <Button onClick={handleSend} disabled={!input.trim() || isLoading} size="icon">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
