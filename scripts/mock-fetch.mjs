/**
 * Offline mode for development and screenshots: replaces fetch for Last.fm, MusicBrainz,
 * Ticketmaster and Nominatim with generated, clearly fictional responses in the documented shapes.
 *
 * Usage (terminal, folder mupla):  npm run dev:mock
 * Never used by `npm run dev` or in production.
 */

const realFetch = globalThis.fetch;
const DAY = 86_400_000;

const artists = [
  ["Nachtfalter Orchester", 812, ["downtempo", "electronic", "jazz"]],
  ["Kiesel & Kobalt", 530, ["indietronica", "dream pop"]],
  ["Lumen Delta", 410, ["ambient", "electronic"]],
  ["Seegras", 322, ["post-rock", "instrumental"]],
  ["Orbit Chor", 150, ["neoclassical", "ambient"]],
  ["Die Fernen Freunde", 95, ["indie rock"]],
  ["Polarlicht Kollektiv", 80, ["electronic", "house"]],
];
const similar = {
  "nachtfalter orchester": [["Glasfaser", 0.91], ["Morgengrau", 0.74], ["Kiesel & Kobalt", 0.7]],
  "kiesel & kobalt": [["Wellenreiter", 0.83], ["Morgengrau", 0.6]],
  "lumen delta": [["Stille Post", 0.8]],
};
const cities = [
  ["Frankfurt am Main", 50.1109, 8.6821, "Beispielhalle"],
  ["Gießen", 50.5841, 8.6784, "Club Muster"],
  ["Marburg", 50.8021, 8.7667, "KFZ Beispiel"],
  ["Köln", 50.9375, 6.9603, "Arena Beispiel"],
  ["Kassel", 51.3127, 9.4797, "Festivalwiese Nord"],
  ["Amsterdam", 52.3676, 4.9041, "Paradiso Beispiel"],
];

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function lastfm(url) {
  const m = url.searchParams.get("method");
  const period = url.searchParams.get("period");
  const name = (url.searchParams.get("artist") ?? "").toLowerCase();
  switch (m) {
    case "user.getTopArtists": {
      const list = period === "1month" ? artists.slice(0, 4) : period === "12month" ? artists.slice(0, 5) : artists;
      return json({ topartists: { artist: list.map(([n, p], i) => ({ name: n, playcount: String(period === "overall" ? p : Math.round(p / 8)), mbid: "", url: `https://www.last.fm/music/${encodeURIComponent(n)}`, "@attr": { rank: String(i + 1) } })), "@attr": { user: "demo" } } });
    }
    case "artist.getTopTags": {
      const a = artists.find(([n]) => n.toLowerCase() === name);
      const other = { glasfaser: ["ambient", "idm"], morgengrau: ["dream pop", "shoegaze"], wellenreiter: ["indietronica", "synthpop"], "stille post": ["post-rock"], "kapelle querfeld": ["polka", "folk"], "unbekannte band ohne bezug": ["techno"] };
      const tags = a ? a[2] : (other[name] ?? ["electronic"]);
      return json({ toptags: { tag: [...tags, "seen live"].map((t, i) => ({ name: t, count: 100 - i * 20 })) } });
    }
    case "artist.getSimilar":
      return json({ similarartists: { artist: (similar[name] ?? []).map(([n, match]) => ({ name: n, match: String(match), mbid: "" })) } });
    case "tag.getSimilar":
      return json({ similartags: { tag: [] } });
    case "artist.getInfo":
      return json({ artist: { name, stats: { listeners: String(50_000 + name.length * 40_000), playcount: "1" } } });
    case "user.getWeeklyChartList": {
      const charts = [];
      for (const y of [2022, 2023, 2024, 2025]) for (const w of [0, 20, 40]) charts.push({ "#text": "", from: String(Date.UTC(y, 0, 1 + w * 7) / 1000), to: String(Date.UTC(y, 0, 8 + w * 7) / 1000) });
      return json({ weeklychartlist: { chart: charts } });
    }
    case "user.getWeeklyArtistChart": {
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      const y = new Date(Number(from) * 1000).getUTCFullYear();
      const list = y === 2023 ? [["Die Fernen Freunde", 310]] : y === 2025 ? [["Nachtfalter Orchester", 400]] : [];
      return json({ weeklyartistchart: { artist: list.map(([n, p], i) => ({ name: n, playcount: String(p), "@attr": { rank: String(i + 1) } })), "@attr": { from, to } } });
    }
  }
  return json({ error: 3, message: "Invalid Method" });
}

function tmEvent(i, name, cityIdx, daysAhead, extra = {}) {
  const [city, lat, lon, venue] = cities[cityIdx];
  const start = new Date(Date.now() + daysAhead * DAY);
  start.setUTCHours(18, 0, 0, 0);
  return {
    id: `DEMO${i}`,
    name,
    url: `https://www.ticketmaster.de/event/demo-${i}`,
    dates: { start: { localDate: start.toISOString().slice(0, 10), localTime: "20:00:00", dateTime: start.toISOString() }, timezone: "Europe/Berlin", status: { code: "onsale" } },
    priceRanges: i % 3 === 0 ? undefined : [{ type: "standard", currency: "EUR", min: 25 + i * 3, max: 45 + i * 4 }],
    classifications: [{ segment: { name: "Music" }, genre: { name: "Dance/Electronic" }, subGenre: { name: "Undefined" } }],
    _embedded: { venues: [{ id: `V${cityIdx}`, name: venue, city: { name: city }, country: { countryCode: cityIdx === 5 ? "NL" : "DE" }, location: { latitude: String(lat), longitude: String(lon) }, timezone: "Europe/Berlin" }], attractions: [{ id: `A${i}`, name }] },
    ...extra,
  };
}

function ticketmaster(url) {
  if (url.searchParams.get("keyword")) return json({ _embedded: { events: [] }, page: { size: 100, totalElements: 0, totalPages: 0, number: 0 } });
  const events = [
    tmEvent(1, "Nachtfalter Orchester", 0, 45),
    tmEvent(2, "Kiesel & Kobalt", 1, 12),
    tmEvent(3, "Glasfaser", 2, 30),
    tmEvent(4, "Die Fernen Freunde", 3, 60),
    tmEvent(5, "Morgengrau", 1, 5),
    tmEvent(6, "Unbekannte Band ohne Bezug", 0, 20),
    tmEvent(7, "Weitwinkel Festival", 4, 200, {
      dates: { start: { localDate: "2027-06-18", localTime: "14:00:00" }, end: { localDate: "2027-06-20" }, timezone: "Europe/Berlin", status: { code: "onsale" } },
      _embedded: {
        venues: [{ id: "V4", name: "Festivalwiese Nord", city: { name: "Kassel" }, country: { countryCode: "DE" }, location: { latitude: "51.3127", longitude: "9.4797" } }],
        attractions: [{ id: "A71", name: "Lumen Delta" }, { id: "A72", name: "Nachtfalter Orchester" }, { id: "A73", name: "Seegras" }, { id: "A74", name: "Wellenreiter" }],
      },
    }),
    tmEvent(8, "Stille Post", 5, 80),
    tmEvent(9, "Polarlicht Kollektiv", 0, 9),
    tmEvent(11, "Seegras", 5, 130),
    tmEvent(12, "Orbit Chor", 2, 16),
    tmEvent(13, "Lumen Delta", 3, 40),
    tmEvent(14, "Wellenreiter", 0, 70),
    // No profile relation at all: only visible on the search page under "Ohne Profilbezug".
    tmEvent(10, "Kapelle Querfeld", 2, 25, { classifications: [{ segment: { name: "Music" }, genre: { name: "Folk" }, subGenre: { name: "Undefined" } }] }),
  ];
  return json({ _embedded: { events }, page: { size: 100, totalElements: events.length, totalPages: 1, number: 0 } });
}

// Eventfrog Public API v1 shapes (docs.api.eventfrog.net, 2026-09-26). Rubric tree is invented.
const efRubrics = [
  { id: 1, parentId: 0, title: { de: "Konzerte", en: "Concerts" } },
  { id: 11, parentId: 1, title: { de: "Rock / Pop", en: "Rock / Pop" } },
  { id: 12, parentId: 1, title: { de: "Jazz", en: "Jazz" } },
  { id: 2, parentId: 0, title: { de: "Party", en: "Party" } },
  { id: 21, parentId: 2, title: { de: "Techno / House", en: "Techno / House" } },
  { id: 3, parentId: 0, title: { de: "Festivals", en: "Festivals" } },
  { id: 4, parentId: 0, title: { de: "Theater", en: "Theatre" } },
];
const efLocations = cities.slice(0, 5).map(([city, lat, lng], i) => ({
  id: String(900 + i), title: { de: ["Kulturhalle Beispiel", "Kellerclub Muster", "Schlosshof Beispiel", "Werkstatt Beispiel", "Seewiese Beispiel"][i] },
  url: `https://eventfrog.ch/de/l/demo-${i}`, city, country: "DE", lat, lng, zip: "00000",
}));
function efEvent(i, title, rubricId, loc, daysAhead, extra = {}) {
  const start = new Date(Date.now() + daysAhead * DAY);
  start.setUTCHours(19, 0, 0, 0);
  return {
    id: String(7000 + i), title: { de: title }, url: `https://eventfrog.ch/de/p/demo-${i}`, rubricId, locationIds: [String(900 + loc)],
    begin: start.toISOString(), end: new Date(start.getTime() + 5 * 3600_000).toISOString(),
    cancelled: false, soldOut: false, littleTicketsLeft: false, agendaEntryOnly: false, visible: true, published: true,
    emblemToShow: i % 2 ? { url: `https://cdn.eventfrog.net/demo/${i}.png`, width: 800, height: 400 } : null,
    emblemCredits: i % 2 ? `Foto: Beispielfotograf*in ${i}` : undefined,
    lowestTicketPrice: 12 + i, presaleLink: `https://tickets.eventfrog.ch/demo-${i}`, ...extra,
  };
}
// Solid-colour PNG, built at runtime so the mock needs no binary files.
import { deflateSync } from "node:zlib";
function png(w, h, [r, g, b]) {
  const crcTable = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (buf) => { let c = 0xffffffff; for (const x of buf) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: w }, () => [r, g, b]).flat())]);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(Buffer.concat(Array(h).fill(row)))), chunk("IEND", Buffer.alloc(0))]);
}

function eventfrog(url) {
  if (url.pathname.endsWith("/rubrics")) return json({ rubrics: efRubrics, totalNumberOfResources: efRubrics.length });
  if (url.pathname.endsWith("/locations")) {
    const ids = url.searchParams.getAll("id");
    const locations = efLocations.filter((l) => ids.includes(l.id));
    return json({ locations, totalNumberOfResources: locations.length });
  }
  const events = [
    efEvent(1, "Sommerlicht Open Air", 3, 4, 120, { end: new Date(Date.now() + 122 * DAY).toISOString() }),
    efEvent(2, "Nachtschicht: Techno bis Sonnenaufgang", 21, 1, 3),
    efEvent(3, "Morgengrau", 11, 2, 22),
    efEvent(4, "Jazz im Schlosshof", 12, 2, 50, { soldOut: true }),
    efEvent(5, "Lumen Delta", 11, 3, 40),
  ];
  return json({ events, totalNumberOfResources: events.length });
}

globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" ? input : input.url);
  if (url.host === "ws.audioscrobbler.com") return lastfm(url);
  if (url.host === "musicbrainz.org") return json(url.pathname.endsWith("/artist") ? { artists: [] } : { genres: [] });
  if (url.host === "app.ticketmaster.com") return ticketmaster(url);
  if (url.host === "api.eventfrog.net") return eventfrog(url);
  if (url.host === "cdn.eventfrog.net") {
    const i = Number(url.pathname.match(/(\d+)\.png$/)?.[1] ?? 0);
    return new Response(png(80, 40, [[40, 90, 160], [160, 60, 90], [30, 120, 80]][i % 3]), { headers: { "content-type": "image/png" } });
  }
  if (url.host === "nominatim.openstreetmap.org") {
    const q = (url.searchParams.get("q") ?? "").toLowerCase();
    const hit = q && cities.find(([c]) => c.toLowerCase().startsWith(q));
    return json(hit ? [{ lat: String(hit[1]), lon: String(hit[2]), name: hit[0], display_name: `${hit[0]}, Deutschland` }] : []);
  }
  return realFetch(input, init);
};
console.log("[mupla] mock-fetch aktiv: fiktive Daten, keine echten API-Aufrufe.");
