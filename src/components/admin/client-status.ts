import { clientStage, type PublicClientAccount } from "@/server/modules/client-accounts/client-accounts.service";

/** Where a client account is in its life: disabled, still at a first-login step, or active. Used by the client list and the client's own page. */
export function accountStatus(account: Pick<PublicClientAccount, "isActive" | "emailVerified" | "mustResetPassword">): { label: string; tone: "neutral" | "accent" | "warning" | "success" } {
  if (!account.isActive) return { label: "Disabled", tone: "neutral" };
  const stage = clientStage(account);
  if (stage === "verify") return { label: "Awaiting email verification", tone: "warning" };
  if (stage === "reset") return { label: "Awaiting new password", tone: "warning" };
  return { label: "Active", tone: "success" };
}
