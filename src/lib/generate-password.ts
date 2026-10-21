/** Letters and digits with the look-alikes (0/O, 1/l/I) left out, so a password read out over the phone is typed correctly. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/** A random temporary password for an administrator to hand out (browser `crypto`, uniform pick, always has a letter and a digit). */
export function generateTemporaryPassword(length = 14): string {
  for (;;) {
    const bytes = new Uint32Array(length);
    crypto.getRandomValues(bytes);
    // Rejection-free uniform pick: 2^32 is not a multiple of the alphabet size, so the tiny bias is removed by discarding the top sliver.
    const limit = Math.floor(0x100000000 / ALPHABET.length) * ALPHABET.length;
    if (bytes.some((b) => b >= limit)) continue;
    const password = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
    if (/[a-z]/i.test(password) && /\d/.test(password)) return password;
  }
}
