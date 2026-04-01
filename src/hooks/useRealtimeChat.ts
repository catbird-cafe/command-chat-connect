import { useEffect, useState, useRef, useCallback } from "react";
import { useSupabaseClient } from "@/contexts/InstanceContext";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: string;
}

export function useRealtimeChat(clientName: string | null, hostName: string) {
  const supabase = useSupabaseClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const prevClient = useRef<string | null>(null);

  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    if (prevClient.current !== clientName) {
      setMessages([]);
      prevClient.current = clientName;
    }

    if (!clientName) return;

    const channel = supabase.channel(`chat:${clientName}`);

    channel
      .on("broadcast", { event: "message" }, ({ payload }) => {
        const msg = payload as ChatMessage;
        setMessages((prev) => [...prev, msg]);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [clientName, supabase]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!channelRef.current || !clientName) return;
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: hostName,
        text,
        timestamp: new Date().toISOString(),
      };
      channelRef.current.send({
        type: "broadcast",
        event: "message",
        payload: msg,
      });
      setMessages((prev) => [...prev, msg]);
    },
    [clientName, hostName]
  );

  return { messages, sendMessage };
}
