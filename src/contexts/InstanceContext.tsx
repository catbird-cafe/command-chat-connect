import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface SupabaseInstance {
  id: string;
  name: string;
  url: string;
  anonKey: string;
}

interface InstanceContextValue {
  instances: SupabaseInstance[];
  activeInstance: SupabaseInstance | null;
  client: SupabaseClient | null;
  addInstance: (instance: Omit<SupabaseInstance, "id">) => SupabaseInstance;
  updateInstance: (id: string, data: Partial<Omit<SupabaseInstance, "id">>) => void;
  removeInstance: (id: string) => void;
  setActiveInstanceId: (id: string) => void;
}

const STORAGE_KEY = "supabase-instances";
const ACTIVE_KEY = "supabase-active-instance";

function loadInstances(): SupabaseInstance[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  // Seed with default instance from env vars
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (url && key) {
    const defaultInstance: SupabaseInstance = {
      id: "default",
      name: "Default",
      url,
      anonKey: key,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([defaultInstance]));
    localStorage.setItem(ACTIVE_KEY, "default");
    return [defaultInstance];
  }
  return [];
}

function loadActiveId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

const InstanceContext = createContext<InstanceContextValue | null>(null);

export function InstanceProvider({ children }: { children: ReactNode }) {
  const [instances, setInstances] = useState<SupabaseInstance[]>(loadInstances);
  const [activeId, setActiveId] = useState<string | null>(loadActiveId);

  const persist = (updated: SupabaseInstance[]) => {
    setInstances(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const addInstance = useCallback((data: Omit<SupabaseInstance, "id">) => {
    const instance: SupabaseInstance = { ...data, id: crypto.randomUUID() };
    setInstances((prev) => {
      const next = [...prev, instance];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    // Auto-activate if first
    setActiveId((prev) => {
      if (!prev) {
        localStorage.setItem(ACTIVE_KEY, instance.id);
        return instance.id;
      }
      return prev;
    });
    return instance;
  }, []);

  const updateInstance = useCallback((id: string, data: Partial<Omit<SupabaseInstance, "id">>) => {
    setInstances((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, ...data } : i));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeInstance = useCallback((id: string) => {
    setInstances((prev) => {
      const next = prev.filter((i) => i.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setActiveId((prev) => {
      if (prev === id) {
        const remaining = instances.filter((i) => i.id !== id);
        const newId = remaining[0]?.id ?? null;
        if (newId) localStorage.setItem(ACTIVE_KEY, newId);
        else localStorage.removeItem(ACTIVE_KEY);
        return newId;
      }
      return prev;
    });
  }, [instances]);

  const setActiveInstanceId = useCallback((id: string) => {
    setActiveId(id);
    localStorage.setItem(ACTIVE_KEY, id);
  }, []);

  const activeInstance = useMemo(
    () => instances.find((i) => i.id === activeId) ?? instances[0] ?? null,
    [instances, activeId]
  );

  const client = useMemo(() => {
    if (!activeInstance) return null;
    return createClient(activeInstance.url, activeInstance.anonKey);
  }, [activeInstance?.id, activeInstance?.url, activeInstance?.anonKey]);

  return (
    <InstanceContext.Provider
      value={{
        instances,
        activeInstance,
        client,
        addInstance,
        updateInstance,
        removeInstance,
        setActiveInstanceId,
      }}
    >
      {children}
    </InstanceContext.Provider>
  );
}

export function useInstances() {
  const ctx = useContext(InstanceContext);
  if (!ctx) throw new Error("useInstances must be used within InstanceProvider");
  return ctx;
}

export function useSupabaseClient() {
  const { client } = useInstances();
  if (!client) throw new Error("No active Supabase instance");
  return client;
}
