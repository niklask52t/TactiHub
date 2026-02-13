import { useState, useRef, useEffect } from 'react';
import { useRoomStore } from '@/stores/room.store';
import { useAuthStore } from '@/stores/auth.store';
import { getSocket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, X, Send } from 'lucide-react';

interface ChatPanelProps {
  open: boolean;
  onToggle: () => void;
}

export function ChatPanel({ open, onToggle }: ChatPanelProps) {
  const chatMessages = useRoomStore((s) => s.chatMessages);
  const unreadCount = useRoomStore((s) => s.unreadCount);
  const resetUnread = useRoomStore((s) => s.resetUnread);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) resetUnread();
  }, [open, chatMessages.length, resetUnread]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages.length]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const socket = getSocket();
    socket.emit('chat:message', { text: input.trim() });
    setInput('');
  };

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="absolute bottom-4 left-4 z-10"
        onClick={onToggle}
      >
        <MessageSquare className="h-4 w-4 mr-1" />
        Chat
        {unreadCount > 0 && (
          <Badge variant="destructive" className="ml-1 h-5 min-w-5 text-xs px-1">
            {unreadCount}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <div className="absolute bottom-4 left-4 z-10 w-80 h-96 bg-background border rounded-lg shadow-lg flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-sm font-medium">Chat</span>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onToggle}>
          <X className="h-3 w-3" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {chatMessages.length === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-4">No messages yet</p>
        )}
        {chatMessages.map((msg, i) => (
          <div key={i}>
            <div className="flex items-baseline gap-1">
              <span className="text-xs font-medium" style={{ color: msg.color }}>
                {msg.username}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-sm break-words">{msg.text}</p>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2 px-3 py-2 border-t">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
          placeholder={isAuthenticated ? 'Type a message...' : 'Log in to chat'}
          disabled={!isAuthenticated}
          className="flex-1 h-8 text-sm"
        />
        <Button size="sm" className="h-8 px-2" onClick={sendMessage} disabled={!isAuthenticated || !input.trim()}>
          <Send className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
