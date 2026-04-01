import { useEffect, useState, useRef } from "react";
import { useSupabaseClient } from "@/contexts/InstanceContext";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface ClientInfo {
  name: string;
  joinedAt: string;
}

export function useRealtimePresence() {
  const supabase = useSupabaseClient();
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const channel = supabase.channel("chat-lobby", {
      config: { presence: { key: "lobby" } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const allClients: ClientInfo[] = [];
        for (const key of Object.keys(state)) {
          for (const presence of state[key]) {
            const p = presence as unknown as Record<string, string>;
            if (p.type === "cli") {
              allClients.push({ name: p.name, joinedAt: p.joinedAt ?? new Date().toISOString() });
            }
          }
        }
        const unique = Array.from(new Map(allClients.map((c) => [c.name, c])).values());
        setClients(unique);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return clients;
}
