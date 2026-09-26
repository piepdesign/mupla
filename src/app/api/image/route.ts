import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { isAllowedImageSource } from "@/lib/images";
import { throttledFetch } from "@/server/http";

/**
 * Serves provider images from local storage. First request downloads the original once and keeps it
 * under .cache/img/, every later request (and every visitor of this local app) gets the stored copy.
 */

const DIR = join(process.cwd(), process.env.MUPLA_CACHE_DIR ?? ".cache", "img");
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };

const headers = (type: string) => ({ "Content-Type": type, "Cache-Control": "public, max-age=604800, immutable" });

export async function GET(req: Request) {
  const src = new URL(req.url).searchParams.get("src") ?? "";
  if (!isAllowedImageSource(src)) return new Response("Bildquelle nicht erlaubt.", { status: 400 });

  const base = join(DIR, createHash("sha1").update(src).digest("hex"));
  for (const [type, ext] of Object.entries(TYPES)) {
    try {
      return new Response(new Uint8Array(await readFile(`${base}.${ext}`)), { headers: headers(type) });
    } catch {
      // not stored in this format
    }
  }

  let res: Response;
  try {
    res = await throttledFetch(src, 250, { headers: { Accept: "image/*" } });
  } catch {
    return new Response("Bild nicht erreichbar.", { status: 502 });
  }
  const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (!res.ok || !TYPES[type]) return new Response("Bild nicht verfügbar.", { status: 404 });
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) return new Response("Bild zu groß.", { status: 413 });

  await mkdir(DIR, { recursive: true });
  await writeFile(`${base}.${TYPES[type]}`, buf);
  return new Response(buf, { headers: headers(type) });
}
