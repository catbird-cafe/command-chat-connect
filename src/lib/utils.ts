import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Base URL of the deployed app (same origin as the SPA). Used for curl install links. */
export function getAppOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

/**
 * Full URL of client registration (`/register`) — same string for the browser and for CLI `REGISTER_URL`.
 * The SPA handles GET (form); POST is forwarded to the Supabase `register` Edge Function by the Vite dev
 * and preview servers (see `vite/register-post-proxy-plugin.ts`). Production hosts need an equivalent POST proxy.
 */
export function getRegistrationPageUrl(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/register`;
}
