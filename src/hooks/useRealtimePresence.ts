import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface ClientInfo {
  name: string;
  joinedAt: string;
}

export function useRealtimePresence() {
  const [clients, setClients] = useState<ClientInfo[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const channel = supabase.channel("chat-lobby", {
      config: { presence: { key: "lobby" } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        console.log("[presence] sync state:", JSON.stringify(state));
        const allClients: ClientInfo[] = [];
        for (const key of Object.keys(state)) {
          for (const presence of state[key]) {
            const p = presence as unknown as Record<string, string>;
            if (p.type === "cli") {
              allClients.push({ name: p.name, joinedAt: p.joinedAt ?? new Date().toISOString() });
            }
          }
        }
        // deduplicate by name
        const unique = Array.from(new Map(allClients.map((c) => [c.name, c])).values());
        console.log("[presence] clients:", unique);
        setClients(unique);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return clients;
}
