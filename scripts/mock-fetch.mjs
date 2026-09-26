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
      const tags = a ? a[2] : ["electronic"];
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
  ];
  return json({ _embedded: { events }, page: { size: 100, totalElements: events.length, totalPages: 1, number: 0 } });
}

globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" ? input : input.url);
  if (url.host === "ws.audioscrobbler.com") return lastfm(url);
  if (url.host === "musicbrainz.org") return json(url.pathname.endsWith("/artist") ? { artists: [] } : { genres: [] });
  if (url.host === "app.ticketmaster.com") return ticketmaster(url);
  if (url.host === "nominatim.openstreetmap.org") return json([]);
  return realFetch(input, init);
};
console.log("[mupla] mock-fetch aktiv: fiktive Daten, keine echten API-Aufrufe.");
