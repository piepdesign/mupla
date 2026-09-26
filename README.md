# mupla

mupla (MusicPlanner) kuratiert Konzerte, Tourneen und Festivals aus deinem Last.fm-Hörprofil. Jede Empfehlung sagt, warum sie da ist. Stufe 1 ist ein lokaler Solo-MVP.

## Einrichten (einmalig)

Voraussetzung: Node.js 20.9 oder neuer (`node -v` im Terminal prüft das).

Im Terminal, in dem Ordner, in dem das Projekt liegen soll (z. B. `~/Code`):

```bash
git clone https://github.com/piepdesign/mupla.git
cd mupla
npm install
cp .env.example .env.local
```

Dann `.env.local` im Editor öffnen und die Werte eintragen. Diese Datei wird nie ins Repo übernommen (`.gitignore`), und die Keys werden nur auf dem Server gelesen, nie an den Browser geschickt.

| Variable | Pflicht | Woher |
|---|---|---|
| `TICKETMASTER_API_KEY` | ja | https://developer-account.ticketmaster.com, „My Apps“, Consumer Key |
| `LASTFM_API_KEY` | ja | https://www.last.fm/api/account/create, Feld „API key“ (Shared Secret wird nicht gebraucht) |
| `LASTFM_USERNAME` | ja | dein Last.fm-Name |
| `CONTACT` | empfohlen | deine E-Mail; steht im User-Agent, MusicBrainz und Nominatim verlangen einen Kontakt |
| `HOME_LAT`, `HOME_LON` | nein | Heimatort, Standard ist Gießen; in der App auch pro Browser änderbar |

## Starten

Im Terminal, im Ordner `mupla`:

```bash
npm run dev
```

Dann im Browser http://localhost:3000 öffnen. Beenden mit `ctrl + c`. Der erste Aufruf dauert etwa eine Minute (Profilaufbau, MusicBrainz erlaubt nur eine Anfrage pro Sekunde), danach kommt alles aus dem Cache.

### Ohne Keys ausprobieren

Im Terminal, im Ordner `mupla`, startet ein Modus mit fiktiven Daten (keine echte Schnittstelle wird angefragt):

```bash
npm run dev:mock
```

## Seiten

| Adresse | Was |
|---|---|
| `/` | Übersicht: jede Ansicht als Reihe mit Kacheln (For You, Upcoming, Nearby, Popular, New, This Week/Month/Year, Season, Off the Grid, Rewind, Last Chance, Favorites); Suche, Standort, Radius, Sortierung und Filter oben wirken auf alle Reihen und stehen in der URL |
| `/ansicht/…` | eine Ansicht vollständig, gleiche Filter |
| `/suche` | freie Suche über Artist, Genre, Ort, Event; Treffer ohne Profilbezug stehen getrennt und ohne Rangfolge darunter |
| `/artist/NAME` | Termine nach eigener Tour, Gastauftritt, Festival; Genres, Ähnliche, deine Hörhistorie |
| `/profil` | gemerkte Termine, Favoriten, „Neu seit deinem letzten Besuch“, Export und Import als JSON |
| `/quellen` | Datenquellen, Lizenzen, Datenschutz |
| `/debug/profil`, `/debug/events` | Rohsicht auf Profil und Termine |
| `/debug/gegenrechnung` | die zehn besten Empfehlungen mit Rechenweg, jede Begründung gegen die Score-Bestandteile geprüft |

## Hörprofil

- http://localhost:3000/debug/profil zeigt das fertige Profil: Gewichte, Genres, Nachbarschaften mit Herkunft, ruhende Artists, Warnungen. Ein anderer Name geht mit `?user=NAME`, ohne MusicBrainz mit `?mb=0`.
- http://localhost:3000/api/profile liefert dasselbe als JSON.

### Caching

Abgerufene Daten liegen als JSON in `.cache/` (nicht im Repo). Haltbarkeiten:

| Daten | Haltbarkeit | Warum |
|---|---|---|
| Termine je Quelle | 6 Stunden | Status (ausverkauft, abgesagt) soll aktuell sein, ohne das Tageslimit von Ticketmaster zu belasten |
| Top-Artists, fertiges Profil | 12 Stunden | ändern sich über Tage, nicht Minuten; einmal am Tag frisch reicht |
| Ähnliche Artists, Tags | 7 Tage | Last.fm berechnet sie aus dem Hörverhalten aller, das verschiebt sich langsam |
| Abgeschlossene Jahrescharts | 365 Tage | vergangene Jahre ändern sich nicht mehr |
| MusicBrainz | 30 Tage | Stammdaten, ändern sich selten; schont das Limit von 1 Anfrage pro Sekunde |

Alles neu laden: den Ordner löschen, im Terminal im Ordner `mupla`:

```bash
rm -rf .cache
```

## Prüfen

Alle Befehle im Terminal, im Ordner `mupla`:

| Befehl | Was er prüft |
|---|---|
| `npm run contrast` | alle Farbpaare aus `src/design/tokens.ts` gegen WCAG 2.1 AA, bricht bei Verstoß oder bei Abweichung zwischen `tokens.ts` und `globals.css` ab |
| `npm run a11y` | axe-Prüfung (WCAG 2.1 AA) der Hauptseiten hell und dunkel, plus Tabreihenfolge. Braucht einen laufenden Server in einem zweiten Terminalfenster (`npm run dev` oder `npm run dev:mock`) und Google Chrome; Adresse über `BASE_URL=http://localhost:3000`, Seiten über `A11Y_PAGES=/,/suche,/profil` |
| `npm test` | Unit-Tests |
| `npm run typecheck` | TypeScript |
| `npm run lint` | ESLint |

## Ordner

| Ordner | Inhalt |
|---|---|
| `00 Konzept/`, `01 Datenquellen/`, `02 Gestaltung/` | Konzeptnotizen aus dem Vault, Grundlage für alles hier |
| `04 Umsetzung/log.md` | Verlauf, eine Zeile pro Etappe |
| `src/app/` | Seiten und Server-Routen (Next.js App Router) |
| `src/components/` | UI-Bausteine: Eventkarte, Regal, Navigation |
| `src/design/tokens.ts` | Farbtokens und die Regel, welche Textfarbe auf welcher Akzentfarbe stehen darf |
| `src/domain/` | reine Logik ohne Netz: Datenmodell, Normalisierung, Zusammenführung, Scoring, Begründungen, Ansichten, Filter |
| `src/server/` | alles mit Keys und Netz: Last.fm, MusicBrainz, Ticketmaster, Nominatim, Cache |
| `src/data/` | Beispieldaten für `/beispiel` |
| `src/lib/` | Formatierung, Favoriten im Browser-Speicher, Links |
| `data/` | eigene Terminliste und ICS-Kalender als weitere Quellen (Format in `data/README.md`) |
| `scripts/` | Kontrast- und Barrierefreiheitsprüfung, Offline-Testdaten |
| `LIZENZEN.md` | Lizenzen aller Schriften und Datenquellen |

## Grenzen der Stufe 1

- Nur ein Profil (deins), Favoriten nur in diesem Browser. Kein Konto, keine Cloud, keine Benachrichtigungen, kein Blend.
- Einzige freie Eventquelle mit Schnittstelle ist Ticketmaster. Clubkonzerte fehlen weitgehend; die eigene Liste `data/curated-events.json` und ICS-Kalender füllen das nur von Hand.
- „New“ heißt „von mupla zum ersten Mal gesehen“, nicht „angekündigt am“: keine Quelle liefert ein Ankündigungsdatum. Der erste Lauf füllt „New“ deshalb nicht.
- Preise und Venue-Größen fehlen oft oder sind geschätzt; die App sagt es an der Karte.
- Last.fm erlaubt die Nutzung ohne Rückfrage nur nicht-kommerziell; für eine öffentliche Version braucht es eine schriftliche Zusage. MusicBrainz-Genres stehen unter CC BY-NC-SA.
