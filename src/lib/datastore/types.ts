/**
 * Abstract data store interface.
 * Implementations can back this with Supabase, IndexedDB, files, raw Postgres, etc.
 */

export interface TokenRecord {
  id: string;
  token: string;
  label: string | null;
  token_type: string;
  expires_at: string | null;
  used: boolean;
  used_at: string | null;
  client_id: string | null;
  created_at: string;
}

export interface CreateTokenInput {
  token: string;
  token_type: string;
  label: string | null;
  expires_at: string | null;
}

export interface RegisterResult {
  client_id: string;
  url: string;
  key: string;
}

export interface DataStore {
  /** List all tokens, newest first */
  listTokens(): Promise<TokenRecord[]>;

  /** Create a new token record */
  createToken(input: CreateTokenInput): Promise<void>;

  /** Delete a token by id */
  deleteToken(id: string): Promise<void>;

  /** Register a client using a token string. Returns connection creds. */
  register(token: string): Promise<RegisterResult>;
}
