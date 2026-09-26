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

Dann `.env.local` im Editor öffnen und die Werte eintragen (Keys, Last.fm-Name, Kontakt-E-Mail). Diese Datei wird nie ins Repo übernommen.

## Starten

Im Terminal, im Ordner `mupla`:

```bash
npm run dev
```

Dann im Browser http://localhost:3000 öffnen. Beenden mit `ctrl + c`.

## Hörprofil (Etappe 2)

Mit `LASTFM_API_KEY` und `LASTFM_USERNAME` in `.env.local`:

- http://localhost:3000/debug/profil zeigt das fertige Profil: Gewichte, Genres, Nachbarschaften mit Herkunft, ruhende Artists, Warnungen. Ein anderer Name geht mit `?user=NAME`, ohne MusicBrainz mit `?mb=0`.
- http://localhost:3000/api/profile liefert dasselbe als JSON.

Der erste Aufbau dauert etwa eine Minute, weil MusicBrainz nur eine Anfrage pro Sekunde erlaubt. Danach kommt alles aus dem Cache.

### Caching

Abgerufene Daten liegen als JSON in `.cache/` (nicht im Repo). Haltbarkeiten:

| Daten | Haltbarkeit | Warum |
|---|---|---|
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
| `npm run a11y` | axe-Prüfung (WCAG 2.1 AA) aller Hauptseiten hell und dunkel, plus Tabreihenfolge. Braucht einen laufenden Server (`npm run build && npm start` in einem zweiten Terminalfenster) und Google Chrome |
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
| `src/domain/` | Datenmodell (Typen), Ansichten, Begründungstexte |
| `src/data/` | Beispieldaten |
| `src/lib/` | Formatierung (Datum, Preis, Entfernung) |
| `scripts/` | Kontrast- und Barrierefreiheitsprüfung |
| `LIZENZEN.md` | Lizenzen aller Schriften und Datenquellen |
