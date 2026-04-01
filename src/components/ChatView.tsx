import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageSquare } from "lucide-react";
import type { ChatMessage } from "@/hooks/useRealtimeChat";

interface ChatViewProps {
  clientName: string | null;
  hostName: string;
  messages: ChatMessage[];
  onSend: (text: string) => void;
}

export function ChatView({ clientName, hostName, messages, onSend }: ChatViewProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput("");
  };

  if (!clientName) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center space-y-3 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto opacity-30" />
          <p className="text-lg font-medium">Select a client to start chatting</p>
          <p className="text-sm">Connected CLI clients appear in the sidebar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-6 py-3">
        <div className="h-2.5 w-2.5 rounded-full bg-primary" />
        <h2 className="text-base font-semibold text-foreground">{clientName}</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground pt-8">
            No messages yet — say hello!
          </p>
        )}
        {messages.map((msg) => {
          const isHost = msg.sender === hostName;
          return (
            <div
              key={msg.id}
              className={`flex ${isHost ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                  isHost
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-secondary text-secondary-foreground rounded-bl-md"
                }`}
              >
                {!isHost && (
                  <div className="text-xs font-medium opacity-70 mb-0.5">
                    {msg.sender}
                  </div>
                )}
                <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                <div className={`text-[10px] mt-1 ${isHost ? "text-primary-foreground/60" : "opacity-40"}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t px-4 py-3 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Message ${clientName}...`}
          autoFocus
          className="flex-1 h-11"
        />
        <Button type="submit" size="icon" className="h-11 w-11 shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
