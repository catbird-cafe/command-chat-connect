import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Full URL of the client registration page (`/register`). Same as the address bar on that page; use everywhere we show or document REGISTER_URL. */
export function getRegistrationPageUrl(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/register`;
}
