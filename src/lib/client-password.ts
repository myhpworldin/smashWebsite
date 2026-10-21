/**
 * The one rule for every client-portal password: at least 8 characters, nothing else (no letter/number/symbol requirements).
 * Kept free of server-only code so the form shows the same check live that the server enforces. It covers both the temporary
 * password an administrator hands out and the one the client chooses.
 */
export const MIN_CLIENT_PASSWORD_LENGTH = 8;

export type PasswordCheck = { id: "length"; label: string; ok: boolean };

export function checkClientPassword(password: string): PasswordCheck[] {
  return [{ id: "length", label: `At least ${MIN_CLIENT_PASSWORD_LENGTH} characters`, ok: password.length >= MIN_CLIENT_PASSWORD_LENGTH }];
}

/** A sentence naming the problem, or null when the password is acceptable. */
export function clientPasswordProblem(password: string): string | null {
  return password.length >= MIN_CLIENT_PASSWORD_LENGTH ? null : `Password must be at least ${MIN_CLIENT_PASSWORD_LENGTH} characters.`;
}
