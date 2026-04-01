import type { SupabaseClient } from "@supabase/supabase-js";
import type { DataStore, TokenRecord, CreateTokenInput, RegisterResult } from "./types";

/**
 * DataStore backed by a Supabase instance.
 * The register call hits the edge function on that instance.
 */
export class SupabaseDataStore implements DataStore {
  constructor(
    private client: SupabaseClient,
    private instanceUrl: string,
  ) {}

  async listTokens(): Promise<TokenRecord[]> {
    const { data, error } = await this.client
      .from("client_tokens")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as TokenRecord[];
  }

  async createToken(input: CreateTokenInput): Promise<void> {
    const { error } = await this.client.from("client_tokens").insert({
      token: input.token,
      token_type: input.token_type,
      label: input.label,
      expires_at: input.expires_at,
    });
    if (error) throw new Error(error.message);
  }

  async deleteToken(id: string): Promise<void> {
    const { error } = await this.client
      .from("client_tokens")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  async register(token: string): Promise<RegisterResult> {
    const res = await fetch(`${this.instanceUrl}/functions/v1/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    return data as RegisterResult;
  }
}
