/** "just now", "12 min ago", "3 hours ago", "2 days ago", or the date once it is over a week old. Pure, so server and client agree. */
export function relativeTime(then: Date, now: Date = new Date()): string {
  const seconds = Math.max(0, Math.round((now.getTime() - then.getTime()) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  if (days < 8) return `${days} ${days === 1 ? "day" : "days"} ago`;
  return then.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

/**
 * The exact moment, in a fixed zone so a server render and its hydration read the same (IST, the team's zone). A browser then
 * swaps in the viewer's own zone (`localStamp`), so a client abroad sees their local time.
 */
export const istStamp = (date: Date): string => `${date.toLocaleString("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })} IST`;

export const localStamp = (date: Date): string => date.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZoneName: "short" });
