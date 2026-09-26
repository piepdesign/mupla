# (C) Provider-Recherche — mupla

> **Stand:** 2026-09-26, Etappe 0 abgeschlossen. Alle Angaben unten per Websuche gegen die Originaldokumentation geprüft, **Abrufdatum jeweils 2026-09-26**. Was nicht belegt werden konnte, ist als **Vermutung** markiert. Die frühere Kandidatenliste steht unten im Abschnitt „Ausgangslage", Korrekturen sind dort vermerkt statt gelöscht.

## Kurzfazit

1. **Für Events gibt es genau eine freie Quelle mit API: die Ticketmaster Discovery API.** Alle anderen Eventquellen (Bandsintown, Songkick, Resident Advisor, Eventim, Reservix, JamBase, PredictHQ, Eventbrite) scheitern an der harten Bedingung: Partnerantrag, Bezahlung, Testlizenz oder Scraping-Verbot.
2. **Die Deutschland-Abdeckung von Ticketmaster ist nicht belegt.** Die Doku nennt für `countryCode` nur US, CA, AU, NZ, MX und für Europa pauschal „other European countries". Die International Discovery API, die DE ausdrücklich abdeckte, nimmt **keine neuen Keys mehr an**. Das ist das größte Risiko des Projekts und muss mit einem echten Key getestet werden, bevor Etappe 1 Sinn ergibt (Testbefehl unten).
3. **Die Geschmacksseite ist solide**: Last.fm + MusicBrainz sind frei, dokumentiert und reichen für Stufe 1.
4. **Stufe 1 lokal ist lizenzrechtlich sauber, Stufe 2 öffentlich nicht automatisch**: Last.fm verlangt für öffentlich zugängliche Seiten eine schriftliche Freigabe, und alle genutzten Quellen sind nur nichtkommerziell frei.

## 1. Provider-Matrix

| Quelle | Kosten | Zugang | Abdeckung DE/EU | Tiefe | Festivals | Ratelimit | Lizenz / Attribution | Stabilität | Beleg |
|---|---|---|---|---|---|---|---|---|---|
| **Ticketmaster Discovery API v2** | kostenlos (keine Preisangabe, Standardkontingent) | Key nach Registrierung selbst erzeugbar | **unklar**: Doku nennt nur US/CA/AU/NZ/MX im `countryCode`, sonst „other European countries". **Vermutung:** DE-Events von ticketmaster.de sind enthalten, Eventim-Bestand (DE-Marktführer) nicht | Preis (`priceRanges`, Füllgrad in DE unbekannt), Venue-Geo (`location` lat/lon), Line-up (`_embedded.attractions`), Laufzeit (`dates.start`/`dates.end`), Status (`dates.status`), Bilder, Ticket-URL. **Keine Kapazität** | teilweise: `dates.end` vorhanden, Tag/Bühne pro Act nicht | 5000 Calls/Tag, 5 req/s; Deep Paging bis Element 1000 (`size * page < 1000`) | nicht kommerziell verwertbar, Caching „nur für angemessene Zeiträume", Datenschutzhinweis im Footer Pflicht, Branding-Guide | lange stabil, aber International-API wurde bereits zurückgefahren | [Getting Started](https://developer.ticketmaster.com/products-and-docs/apis/getting-started/), [Discovery v2](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/), [Discovery Manual](https://developer.ticketmaster.com/products-and-docs/apis/discovery-manual/v2/), [Terms](https://developer.ticketmaster.com/support/terms-of-use/) |
| Ticketmaster International Discovery API | – | **keine neuen Keys** | nannte DE, AT, CH, NL, BE, DK, PL u. a. ausdrücklich | – | – | – | – | abgekündigt für Neuintegrationen | [International Discovery](https://developer.ticketmaster.com/products-and-docs/apis/international-discovery/v2/) |
| **Last.fm API** | kostenlos | Key selbst erzeugbar (Last.fm-Konto) | global (Geschmack, keine Events) | Top-Artists (`period`: overall, 7day, 1month, 3month, 6month, 12month), Wochencharts historisch (`user.getWeeklyChartList` + `user.getWeeklyArtistChart`), `artist.getSimilar` mit `match` 0–1 und MBID | – | keine Zahl dokumentiert; Last.fm setzt Limits „nach eigenem Ermessen", Caching nach HTTP-Headern Pflicht. Die oft zitierten „5 req/s" stehen **nicht** in den Bedingungen | nur nichtkommerziell; „powered by AudioScrobbler"-Button; Links auf Artists gehen auf die Last.fm-Katalogseite; **öffentlicher Zugang nur nach schriftlicher Freigabe** (Ziffer 2.7); max. 100 MB gespeicherte Daten | seit Jahren stabil, wird aber nicht weiterentwickelt | [API ToS](https://www.last.fm/api/tos), [artist.getSimilar](https://www.last.fm/api/show/artist.getSimilar), [user.getTopArtists](https://www.last.fm/api/show/user.getTopArtists), [user.getWeeklyArtistChart](https://www.last.fm/api/show/user.getWeeklyArtistChart) |
| **MusicBrainz API** | kostenlos | ohne Key, aussagekräftiger User-Agent Pflicht (`App/Version ( Kontakt )`) | global | MBIDs, Artist-Beziehungen, Gründungs-/Auflösungsdaten, Genres | – | 1 req/s pro IP im Schnitt, darüber 503 für **alle** Anfragen | Kerndaten CC0; **Tags und Genres sind CC BY-NC-SA 3.0** (Attribution, nichtkommerziell) | sehr stabil, gemeinnützig | [Rate Limiting](https://musicbrainz.org/doc/MusicBrainz_API/Rate_Limiting), [Data License](https://musicbrainz.org/doc/About/Data_License), [Datenbank Kern/Zusatz](https://musicbrainz.org/doc/MusicBrainz_Database) |
| **Wikidata (SPARQL)** | kostenlos | ohne Key | global, Festival-Einträge lückenhaft (**Vermutung**) | Gründungsjahr (`P571`), Venue-Kapazität, Koordinaten | Stammdaten ja, Termine nein | Abfrage-Timeout und Nutzungsgrenzen existieren, Werte konnte ich nicht abrufen (Seite nicht erreichbar) → **Vermutung**: 60 s Timeout | CC0 (**Vermutung**, Seite nicht abrufbar) | stabil | [Query limits](https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service/query_limits) (nicht abrufbar, nur Suchtreffer) |
| **Nominatim (OSM)** | kostenlos | ohne Key, eigener User-Agent Pflicht | global | Geocoding | – | max. 1 req/s, kein Massen-Geocoding, Caching Pflicht | ODbL, Attribution „© OpenStreetMap-Mitwirkende" sichtbar | stabil | [Usage Policy](https://operations.osmfoundation.org/policies/nominatim/) |
| setlist.fm API | kostenlos nur nichtkommerziell | Key nach Registrierung „beantragen" | global | Setlists **vergangener** Konzerte | – | nicht dokumentiert | nichtkommerziell | stabil | [API-Doku](https://api.setlist.fm/docs/1.0/index.html) |
| Bandsintown | – | App-ID nur für Artists und deren Vertreter\*innen, alles andere braucht **schriftliche Freigabe** | – | – | – | – | Widgets unverändert, keine Vermischung mit Fremddaten | – | [Data Application Terms](https://corp.bandsintown.com/data-applications-terms) |
| Songkick | **kostenpflichtig** | Partnerantrag mit Lizenzgebühr, „not approving … hobbyist purposes" | – | – | – | – | – | – | [Songkick Developer](https://www.songkick.com/developer) |
| Resident Advisor | – | keine öffentliche API | – | – | – | – | Bots, Crawler, Scraper ausdrücklich verboten (Ziffer 4.4) | – | [RA Terms](https://ra.co/terms) |
| Eventim | – | keine öffentliche API; Affiliate-Programm über Awin mit **Bewerbung und Freigabe** | – | – | – | – | – | – | [Awin eventim DE](https://ui.awin.com/merchant-profile/11388) |
| Reservix | – | API nur über Partnerschaft (partnerships@reservix.de) | – | – | – | – | – | – | [Reservix APIs](https://www.reservix.net/ticketing-apis-und-schnittstellen-mit-reichweite/) |
| Eventbrite | – | öffentliche Suche seit 20.02.2020 abgeschaltet, nur eigene Events abrufbar | – | – | – | – | – | – | [Abschaltung Search API](https://github.com/Automattic/eventbrite-api/issues/83) |
| JamBase | Testphase, dann Vertrieb | – | – | – | – | – | – | – | [JamBase Data](https://data.jambase.com/) |
| PredictHQ | nur Testphase | – | – | – | – | – | – | – | [Pricing](https://www.predicthq.com/pricing) |
| ICS-/RSS-Feeds einzelner Venues und Festivals | kostenlos | ohne Key | nur die eingebundenen Häuser | sehr unterschiedlich, meist Titel, Datum, Ort | je Feed | – | je Anbieter prüfen (**Vermutung**: meist unproblematisch) | – | nicht allgemein belegbar |

## 2. Empfehlung

- **Primärquelle Events: Ticketmaster Discovery API v2**, unter Vorbehalt des DE-Tests.
- **Ergänzung 1: Kuratierte Festival- und Venue-Liste als eigene Datei** (`data/festivals.json`, von Fynn gepflegt, plus ICS-Feeds einzelner Häuser, wo vorhanden). Ehrlich: das ist ein Notbehelf, kein Provider. Eine zweite freie Event-API existiert nicht.
- **Ergänzung 2: Wikidata** für Stammdaten, die Ticketmaster fehlen: Gründungsjahr von Festivals (Ansicht „New"), Venue-Kapazität (Filter „Größe").
- **Geschmack:** Last.fm (Profil, Ähnlichkeit) + MusicBrainz (MBID-Brücke, Genres).
- **Geo:** Venue-Koordinaten kommen aus Ticketmaster. Nominatim nur als Rückfall für die Heimatkoordinate und kuratierte Einträge, gecacht.

**Verworfen:** Bandsintown (Freigabe nötig, keine Vermischung erlaubt), Songkick (kostenpflichtig), Resident Advisor (Scraping verboten, keine API), Eventim und Reservix (Partner-Gate), Eventbrite (Suche abgeschaltet), JamBase und PredictHQ (nur Testphase), setlist.fm (nur Vergangenheit, für Stufe 1 ohne Funktion), Ticketmaster International (keine neuen Keys), Spotify (Stufe 2, nicht geprüft).

## 3. Feldabdeckung gegen das Datenmodell

| Feld | Quelle | Anmerkung |
|---|---|---|
| `MusicEvent.title`, `startsAt`, `officialTicketUrl`, `status` | Ticketmaster | `status` mappen: onsale→onsale, canceled→cancelled, offsale/postponed/rescheduled→unknown bzw. eigener Wert; `soldout` und `presale` **nicht direkt** vorhanden (**Vermutung**: über `sales.presales` ableitbar) |
| `endsAt`, `durationDays` | Ticketmaster `dates.end`, sonst kuratierte Liste | Füllgrad bei Festivals unbekannt |
| `venue.name/city/country/lat/lon` | Ticketmaster | |
| `venue.capacity` | Wikidata, sonst **geschätzt** | `capacityEstimated: true` setzen |
| `lineup[]` | Ticketmaster `_embedded.attractions` | Rolle headliner/support **nicht belegt**, Tag und Bühne fehlen → bleiben leer |
| `genres` | Ticketmaster `classifications` (grob), Last.fm/MusicBrainz über den Artist | |
| `price` | Ticketmaster `priceRanges` | Füllgrad in DE unbekannt, sonst „Preis unbekannt" |
| `size` | abgeleitet aus Kapazität | fast immer „geschätzt" |
| `merchUrl` | **keine Quelle** | bleibt leer, Funktion entfällt in Stufe 1 |
| `announcedAt` | **keine belegte Quelle** (**Vermutung**: `sales.public.startDateTime` als Näherung) | |
| `firstEditionYear` | Wikidata `P571`, sonst kuratierte Liste | |
| `Artist.mbid` | Last.fm (liefert MBID), MusicBrainz | |
| `Artist.listeners` | Last.fm | |
| `Artist.foundedYear` | MusicBrainz | |
| `Artist.imageUrl` | Ticketmaster `images` | Last.fm-Bilder sind aus den Bedingungen ausgenommen, nicht nutzen |
| `TasteProfile.topArtists` | Last.fm `user.getTopArtists` (mehrere `period`) | |
| `TasteProfile.topTags` | **abgeleitet** aus `artist.getTopTags` der Top-Artists | `user.getTopTags` liefert laut Doku „tags used by this user". **Vermutung:** das sind selbst vergebene Tags, nicht das Hörprofil. In Etappe 2 mit echtem Aufruf klären |
| `adjacentArtists` | Last.fm `artist.getSimilar` (`match`) | |
| `adjacentTags` | Last.fm `tag.getSimilar` | im Last.fm-Supportforum als defekt gemeldet ([Thread](https://support.last.fm/t/tag-getsimilar-does-not-work/118230), Inhalt nicht abrufbar). **Vermutung:** liefert leer. Notbehelf: Nachbar-Tags aus den Tags der Similar-Artists berechnen |
| `dormantArtists` | Last.fm `user.getWeeklyChartList` + `user.getWeeklyArtistChart` | viele Aufrufe → Caching zwingend |

## 4. Lückenliste

| Funktion | Befund | Notbehelf |
|---|---|---|
| **Events in Deutschland überhaupt** | unbelegt, Kernrisiko | DE-Test mit echtem Key. Fällt er schwach aus, ist Stufe 1 nur mit ticketmaster.de-Bestand plus kuratierter Liste machbar, und das sagt die UI offen |
| Clubkonzerte | kein freier Zugang zu Eventim, Reservix, RA, Dice | kuratierte ICS-Feeds von Lieblings-Venues; UI-Hinweis „Clubszene unvollständig" |
| Preisspannen | nur Ticketmaster, Füllgrad unbekannt | „Preis unbekannt" sichtbar, Filter-Schalter wie geplant |
| Venue-Kapazität | nur Wikidata, lückenhaft | Schätzung, als geschätzt markiert |
| Festival-Line-ups mit Tag/Bühne | keine freie Quelle | Attractions-Liste ohne Tag/Bühne; kuratierte Festivaldatei für die wichtigsten |
| Ansicht „New" | Gründungsjahr nur via Wikidata | nur Festivals mit Wikidata-Eintrag, sonst Ansicht beschneiden |
| Ansicht „Letzte Chance" | Ticketverfügbarkeit nicht belegt | nur „bald und nicht als abgesagt/offsale markiert", Text ehrlich formulieren |
| Merch-Links | keine Quelle | Funktion entfällt in Stufe 1 |
| „Neu angekündigt" | kein Ankündigungsdatum | Näherung über Vorverkaufsstart oder erstes Auftauchen im eigenen Cache |
| Veröffentlichung (Stufe 2) | Last.fm: öffentliche Seiten nur mit schriftlicher Freigabe; alle Quellen nichtkommerziell | vor Stufe 2 Freigabe bei Last.fm anfragen |

Einschätzung: Die Kernfunktion (Geschmack → passende Termine mit Begründung) ist mit freien Quellen **tragfähig für große Tourneen und Hallenkonzerte, nicht für die Clubszene.** Ob das für Fynns Profil reicht, entscheidet der DE-Test.

## 5. Attributionsliste (sichtbar in der App)

- „powered by AudioScrobbler"-Button von last.fm/resources, Artist-Links auf die Last.fm-Katalogseite.
- „Genre-Daten: MusicBrainz, CC BY-NC-SA 3.0" mit Link.
- „Eventdaten: Ticketmaster" gemäß Branding-Guide (design.ticketmaster.com), plus Datenschutzhinweis im Footer (Ticketmaster-Bedingungen).
- „© OpenStreetMap-Mitwirkende, ODbL", sobald Nominatim genutzt wird.
- „Daten: Wikidata (CC0)" als Kulanz, nicht Pflicht (**Vermutung** zur Lizenz).

## 6. Keys

| Key | Wo | Schritte |
|---|---|---|
| Ticketmaster | [developer-account.ticketmaster.com](https://developer-account.ticketmaster.com/) | Konto anlegen → „My Apps" → der „Consumer Key" ist der `apikey` (Bezeichnung **Vermutung**, im Portal prüfen) |
| Last.fm | [last.fm/api/account/create](https://www.last.fm/api/account/create) | mit Last.fm-Konto einloggen → Anwendungsname „mupla", Beschreibung, Callback leer → „API key" kopieren (Shared Secret wird in Stufe 1 nicht gebraucht) |
| MusicBrainz, Wikidata, Nominatim | kein Key | nur User-Agent mit Kontakt |

DE-Test, sobald der Ticketmaster-Key da ist (Terminal, beliebiger Ordner, `DEIN_KEY` ersetzen):

```bash
curl -s "https://app.ticketmaster.com/discovery/v2/events.json?apikey=DEIN_KEY&countryCode=DE&classificationName=music&size=1" | grep -o '"totalElements":[0-9]*'
```

Und einmal im Umkreis von Gießen (100 km):

```bash
curl -s "https://app.ticketmaster.com/discovery/v2/events.json?apikey=DEIN_KEY&latlong=50.5841,8.6784&radius=100&unit=km&classificationName=music&size=1" | grep -o '"totalElements":[0-9]*'
```

## Ausgangslage (Kandidatenliste vor Etappe 0)

Die ursprüngliche Liste (Last.fm, MusicBrainz, ListenBrainz, Spotify, Wikidata, Ticketmaster, Bandsintown, Songkick, setlist.fm, Resident Advisor, Dice/Eventim/regionale Vorverkäufer, Festival-Aggregatoren, OSM/Nominatim/Photon, ICS-Feeds) wurde oben geprüft. Korrekturen gegenüber dem Vorwissen: Bandsintown ist nicht nur „unsicher", sondern ohne schriftliche Freigabe ausgeschlossen; Songkick ist kostenpflichtig; MusicBrainz-Genres sind nicht CC0, sondern CC BY-NC-SA; Last.fm nennt kein festes Ratelimit. Nicht geprüft: ListenBrainz, Spotify (Stufe 2), Dice, Festival-Aggregatoren, Photon (Nutzungsseite nicht abrufbar).

## Architekturfolge

Weil einzelne Quellen wegbrechen können, wird die Datenschicht als **Adapter hinter einem gemeinsamen Schema** gebaut: jeder Provider bekommt ein eigenes Modul, das auf das Schema in [[03 Projekte/mupla/01 Datenquellen/(C) Datenmodell\|(C) Datenmodell.md]] abbildet. Kuratierung und UI kennen nur das Schema, niemals einen Provider. Die kuratierte Festivaldatei ist in diesem Sinne ein eigener Adapter.
