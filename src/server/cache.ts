import "server-only";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Two-level cache: memory first, then JSON files under .cache/ (git-ignored).
 * Survives dev-server restarts, so reloading the app does not hit the APIs again.
 */

const DIR = join(process.cwd(), process.env.MUPLA_CACHE_DIR ?? ".cache");
const memory = new Map<string, { expires: number; value: unknown }>();
const inflight = new Map<string, Promise<unknown>>();

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

function fileFor(key: string) {
  const safe = key.replace(/[^a-z0-9._-]+/gi, "_").slice(0, 80);
  const hash = createHash("sha1").update(key).digest("hex").slice(0, 10);
  return join(DIR, `${safe}.${hash}.json`);
}

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = memory.get(key);
  if (hit && hit.expires > now) return hit.value as T;

  const file = fileFor(key);
  try {
    const disk = JSON.parse(await readFile(file, "utf8")) as { expires: number; value: T };
    if (disk.expires > now) {
      memory.set(key, disk);
      return disk.value;
    }
  } catch {
    // no cache file yet
  }

  // Deduplicate concurrent loads of the same key.
  const running = inflight.get(key);
  if (running) return running as Promise<T>;
  const p = (async () => {
    const value = await load();
    const entry = { expires: Date.now() + ttlMs, value };
    memory.set(key, entry);
    await mkdir(DIR, { recursive: true });
    await writeFile(file, JSON.stringify(entry));
    return value;
  })().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}
