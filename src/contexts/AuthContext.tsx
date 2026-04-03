import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
  id: string;
  user_id: string;
  google_name: string | null;
  display_name: string | null;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  displayName: string;
  updateDisplayName: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    setProfile(data);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Store name for backward compat with chat
          const name = session.user.user_metadata?.full_name;
          if (name) localStorage.setItem("chat-host-name", name);
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setProfile(null);
          localStorage.removeItem("chat-host-name");
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const name = session.user.user_metadata?.full_name;
        if (name) localStorage.setItem("chat-host-name", name);
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const displayName = profile?.display_name || profile?.google_name || user?.user_metadata?.full_name || "Host";

  // Keep localStorage in sync for chat hooks
  useEffect(() => {
    if (displayName && displayName !== "Host") {
      localStorage.setItem("chat-host-name", displayName);
    }
  }, [displayName]);

  const updateDisplayName = useCallback(async (name: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name })
      .eq("user_id", user.id);
    if (error) throw error;
    setProfile((p) => p ? { ...p, display_name: name } : p);
  }, [user]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("chat-host-name");
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, displayName, updateDisplayName, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
