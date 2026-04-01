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

/** Full URL of the client registration page (`/register`). Same as the address bar on that page; use everywhere we show or document REGISTER_URL. */
export function getRegistrationPageUrl(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/register`;
}
