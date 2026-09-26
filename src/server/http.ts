import "server-only";

/**
 * Serialised fetch per host with a minimum gap between requests.
 * MusicBrainz and Nominatim allow ~1 request/second; exceeding it blocks all requests.
 */

const queues = new Map<string, Promise<void>>();

export function userAgent(): string {
  const contact = process.env.CONTACT?.trim() || "https://github.com/piepdesign/mupla";
  return `mupla/0.1 ( ${contact} )`;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public url: string,
    message: string,
  ) {
    super(message);
  }
}

export async function throttledFetch(url: string, minGapMs: number, init: RequestInit = {}): Promise<Response> {
  const host = new URL(url).host;
  const previous = queues.get(host) ?? Promise.resolve();
  let release!: () => void;
  const mine = new Promise<void>((r) => (release = r));
  queues.set(
    host,
    previous.then(() => mine),
  );
  await previous;
  try {
    return await fetch(url, {
      ...init,
      headers: { "User-Agent": userAgent(), Accept: "application/json", ...(init.headers ?? {}) },
      signal: init.signal ?? AbortSignal.timeout(15_000),
    });
  } finally {
    setTimeout(release, minGapMs);
  }
}
