import { formatMoney, type ClientCurrency } from "@/lib/client-options";
import { relativeTime } from "@/lib/client-time";

/** `2026-10-20` → "20 Oct 2026". Parsed as a plain calendar day (UTC), so it never slips a day with the viewer's time zone. */
export const fmtDay = (key: string | null | undefined): string => (key ? new Date(`${key}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—");

/** An ISO moment → "20 Oct 2026, 4:30 pm" in IST (the team's zone), the same on the server and in the browser. */
export const fmtMoment = (iso: string | null | undefined): string => (iso ? `${new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })}` : "—");

export const ago = (iso: string | null | undefined): string => (iso ? relativeTime(new Date(iso)) : "—");
export const money = (n: number | null | undefined, currency: ClientCurrency): string => (typeof n === "number" ? formatMoney(n, currency) : "—");
export const initialsOf = (name: string): string => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
