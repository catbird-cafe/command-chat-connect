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

/** URL of the registration page in the browser (SPA route). */
export function getRegistrationPageUrl(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/register`;
}

/** API endpoint for CLI registration (edge function). */
export function getRegistrationApiUrl(): string {
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL ?? "";
  return supabaseUrl ? `${supabaseUrl.replace(/\/$/, "")}/functions/v1/register` : "";
}
