import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MongoClient } from "mongodb";

/**
 * Development/verification only: a throwaway `mongod` (data in a temp
 * directory, deleted on stop) so the app and the tests run without a
 * MongoDB service. Needs the MongoDB server binary on PATH, or set
 * MONGOD_BINARY to its path (macOS: `brew install mongodb-community`).
 */
export type TempMongod = { uri: string; port: number; stop: () => Promise<void> };

const freePort = () =>
  new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as { port: number };
      server.close(() => resolve(port));
    });
  });

export async function startTempMongod(requestedPort?: number): Promise<TempMongod> {
  const port = requestedPort ?? (await freePort());
  const dir = await mkdtemp(join(tmpdir(), "smash-mongod-"));
  const child: ChildProcess = spawn(process.env.MONGOD_BINARY ?? "mongod", ["--dbpath", dir, "--port", String(port), "--bind_ip", "127.0.0.1", "--nounixsocket", "--wiredTigerCacheSizeGB", "0.25"], { stdio: "ignore" });
  const uri = `mongodb://127.0.0.1:${port}`;
  const exited = new Promise<never>((_, reject) => {
    child.once("error", (err) => reject(new Error(`Could not start mongod (${err.message}). Install MongoDB Community or set MONGOD_BINARY.`)));
    child.once("exit", (code) => reject(new Error(`mongod exited with code ${code} (is port ${port} already in use?)`)));
  });
  exited.catch(() => undefined);

  const ready = (async () => {
    for (let i = 0; i < 100; i++) {
      const probe = new MongoClient(uri, { serverSelectionTimeoutMS: 300 });
      try {
        await probe.connect();
        await probe.db("admin").command({ ping: 1 });
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 100));
      } finally {
        await probe.close().catch(() => undefined);
      }
    }
    throw new Error("mongod did not become ready in time");
  })();

  const stop = async () => {
    child.removeAllListeners("exit");
    child.kill("SIGTERM");
    await new Promise((r) => (child.exitCode !== null ? r(null) : child.once("exit", r)));
    await rm(dir, { recursive: true, force: true });
  };
  try {
    await Promise.race([ready, exited]);
  } catch (err) {
    await stop();
    throw err;
  }
  return { uri, port, stop };
}
