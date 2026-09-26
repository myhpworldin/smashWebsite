import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": r("./src"),
      // `server-only` throws outside the Next.js server bundle; tests run in plain Node.
      "server-only": r("./tests/server-only-stub.ts"),
    },
  },
  // A throwaway mongod is started once (tests/global-setup.ts); each test builds a fresh database on it.
  test: { include: ["tests/**/*.test.ts"], testTimeout: 30_000, globalSetup: ["tests/global-setup.ts"] },
});
