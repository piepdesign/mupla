# Abnahme Stufe 1

Stand 2026-09-26, Branch `claude/project-thread-sp1ewt`. Geprüft gegen die fünf Abnahmekriterien aus `00 Konzept/(C) Produktspezifikation.md`.

## Urteil je Kriterium

| # | Kriterium | Urteil | Beleg |
|---|---|---|---|
| 1 | Mit Fynns Last.fm-Namen erscheinen ohne manuelle Eingabe echte, zukünftige Events, die zum Profil passen | **erfüllt** (Nachtrag 2026-09-26) | Fynns lokaler Lauf mit echtem Profil und echten Ticketmaster-Daten: `/debug/gegenrechnung` zeigt 10 Empfehlungen, „alle Prüfungen bestanden“. Damit ist auch Kriterium 2 mit echten Daten belegt. |
| 2 | Jede Karte trägt eine wahre Begründung, die auf konkrete Profildaten zurückführt | erfüllt (mit Testdaten) | Typ erzwingt mindestens eine Begründung, `scoreMatch` verwirft Karten ohne. Gegenrechnung unten: 10 von 10 stimmen, 34 von 34 Einzelprüfungen. |
| 3 | Alle Filter wirken kombiniert und ohne Neuladen | erfüllt | Filter laufen im Browser über den bereits geladenen Bestand, die URL wird per `history.replaceState` mitgeschrieben, kein Serveraufruf. 57 Filtertests. Browsertest: Umkreis, Wochenende, Regler ändern Liste und URL, Ansichtswechsel behält `?km=400`. |
| 4 | Kontrast, Tastatur und Fokus erfüllen WCAG AA; Farbe nie allein informationstragend | erfüllt, Screenreader-Test offen | Kontrast 25/25, axe 0 Verstöße auf 8 Seiten hell und dunkel, Tastaturdurchlauf unten. Status, Favorit und Prüfergebnis stehen immer als Text. Einen echten Screenreader-Durchlauf habe ich nicht gemacht. |
| 5 | Keine Datenquelle kostet Geld, alle Ticketlinks führen auf offizielle Verkaufsstellen | erfüllt | Quellen unten. Ticketlinks kommen nur aus `officialTicketUrl` (Ticketmaster `url` oder deine eigene Liste), nie aus Zweitmarkt-Quellen. |

## 1. Kontrast

Im Terminal, Ordner `mupla`: `npm run contrast`

```text
ok    17.42:1  (min 4.5)  dark: text on bg  #F4F1EA on #0B0B0F
ok     9.35:1  (min 4.5)  dark: text-muted on bg  #B4B1C0 on #0B0B0F
ok     4.39:1  (min 3)  dark: control-border on bg  #77758A on #0B0B0F
ok    15.66:1  (min 3)  dark: focus ring on bg  #D7F25C on #0B0B0F
ok    15.79:1  (min 4.5)  dark: text on surface  #F4F1EA on #17171F
ok     8.48:1  (min 4.5)  dark: text-muted on surface  #B4B1C0 on #17171F
ok     3.98:1  (min 3)  dark: control-border on surface  #77758A on #17171F
ok    14.21:1  (min 3)  dark: focus ring on surface  #D7F25C on #17171F
ok    17.42:1  (min 4.5)  light: text on bg  #0B0B0F on #F4F1EA
ok     7.01:1  (min 4.5)  light: text-muted on bg  #52505A on #F4F1EA
ok     3.90:1  (min 3)  light: control-border on bg  #7C786E on #F4F1EA
ok     6.53:1  (min 3)  light: focus ring on bg  #3B2BF5 on #F4F1EA
ok    19.32:1  (min 4.5)  light: text on surface  #0B0B0F on #FFFDF8
ok     7.78:1  (min 4.5)  light: text-muted on surface  #52505A on #FFFDF8
ok     4.33:1  (min 3)  light: control-border on surface  #7C786E on #FFFDF8
ok     7.25:1  (min 3)  light: focus ring on surface  #3B2BF5 on #FFFDF8
ok    15.66:1  (min 4.5)  accent acid: ink text  #0B0B0F on #D7F25C
ok    10.87:1  (min 4.5)  accent cyan: ink text  #0B0B0F on #22D3EE
ok    11.25:1  (min 4.5)  accent amber: ink text  #0B0B0F on #FFB703
ok     6.34:1  (min 4.5)  accent coral: ink text  #0B0B0F on #FF5A3C
ok     6.53:1  (min 4.5)  accent electric: paper text  #F4F1EA on #3B2BF5
ok     6.30:1  (min 4.5)  accent violet: paper text  #F4F1EA on #6D28D9
ok     8.30:1  (min 4.5)  accent deep-green: paper text  #F4F1EA on #0F5132
ok    13.84:1  (min 4.5)  accent plum: paper text  #F4F1EA on #2A1A4A
ok     3.92:1  (min 3)  accent magenta: paper large text only  #F4F1EA on #E0218A

25/25 pairs pass WCAG 2.1 AA.
```

Magenta trägt nur Großtext (3:1); `tokens.ts` verhindert per Typ, dass Magenta Fließtext bekommt.

## 2. Tastaturdurchlauf

Automatisch geprüft mit Chromium (Tab bis zum Seitenende, pro Stopp Fokusring und Zielgröße gemessen) auf `/`, `/suche`, `/profil`, `/artist/…`, `/quellen`.

- **Tabreihenfolge** auf jeder Seite: Zum Inhalt springen, Logo, Suche, Mein Profil, Darstellung, dann die 13 Ansichten, dann Inhalt (Heimatort, Rechenweg-Schalter, Filterleiste, Karten mit Begründungslinks, Merken, Tickets). Reihenfolge folgt der Lesereihenfolge, keine Falle, kein positiver `tabindex`.
- **Sprungmarke**: erster Tabstopp, wird beim Fokus sichtbar, Enter setzt den Fokus auf `main#inhalt` (geprüft).
- **Fokus sichtbar**: 2 px Ring mit 2 px Abstand an jedem Stopp. Bei der Abnahme gefunden und behoben: Datumsfelder (Chromium fokussiert ein inneres Segment, der Ring fehlte am Kalendersymbol) und das Logo (30 px hoch, jetzt 44 px). Einziger Stopp ohne Ring ist das Next.js-Entwicklerwerkzeug, das es nur im Dev-Modus gibt.
- **Bedienung**: Filtergruppen öffnen mit Enter, Checkboxen mit Leertaste, Entdeckungsregler mit Pfeiltasten (Schritte zu 10 %), Merken mit Leertaste (`aria-pressed` wechselt). Alles geprüft, die URL folgt jeder Änderung.
- **Zielflächen**: alle Bedienelemente mindestens 44 px hoch. Ausnahme sind Links im Fließtext (Artistnamen in der Begründung), die WCAG 2.5.8 ausdrücklich ausnimmt.
- **Schwäche**: Auf Seiten mit Filterleiste liegen 18 Stopps vor dem Inhalt und gut 15 in der Filterleiste (Datumsfelder zählen je Segment). Die Sprungmarke fängt das ab, eine zweite Marke „Zu den Ergebnissen“ wäre bequemer (steht in der Lückenliste).

### Was du selbst mit einem Screenreader prüfen solltest

VoiceOver auf dem Mac: `cmd + F5` an und aus, Rotor mit `ctrl + option + U`.

1. Rotor, Überschriften: Jedes Regal muss als Überschrift mit Titel erscheinen, jede Karte als Überschrift darunter.
2. Eine Karte vorlesen lassen: Kommt die Begründung als Satz, und sagt der Ticketlink „Tickets für …, offizieller Verkauf, externer Link, neuer Tab“?
3. Merken drücken: VoiceOver muss „ausgewählt“ bzw. „gedrückt“ ansagen.
4. Einen Filter ändern: Die Trefferzahl („12 Termine passen.“) muss ohne Fokuswechsel angesagt werden (`aria-live`).
5. Entdeckungsregler: Ansage „30 Prozent“, nicht nur „30“.
6. Profilseite, JSON importieren: Die Erfolgs- oder Fehlermeldung muss angesagt werden.
7. Mit `prefers-reduced-motion` (Systemeinstellungen, Bedienungshilfen, Anzeige, Bewegung reduzieren): Es darf sich nichts mehr animiert bewegen.

## 3. Stichprobe: zehn Empfehlungen gegengerechnet

**Mit fiktiven Daten** (`npm run dev:mock`), weil dein echtes Profil noch fehlt. Mit echten Daten rechnest du dasselbe unter http://localhost:3000/debug/gegenrechnung nach; die Seite prüft jede Begründung automatisch gegen den Treffer, aus dem der Score entstand.

Score = 0,5 × Profilnähe + 0,2 × Erreichbarkeit + 0,15 × Zeitnähe + 0,15 × Entdeckung − 0,2 × Preisreibung. Standardeinstellungen: Entdeckung 30 %, Heimatort Gießen.

| Empfehlung | Profil | Erreichb. | Zeit | Entd. | Preis | Score | Begründung (Beleg aus dem Treffer) | Prüfung |
|---|---|---|---|---|---|---|---|---|
| 1. Nachtfalter Orchester, Frankfurt am Main | 1,000 | 0,895 | 1,000 | 0,000 | 0,000 | **0,829** | Weil du Nachtfalter Orchester 812-mal gehört hast. (Profil: Nachtfalter Orchester, 812 Scrobbles) | stimmt |
| 2. Weitwinkel Festival, Kassel | 1,000 | 0,803 | 0,537 | 0,000 | 0,000 | **0,741** | 3 Acts aus deinem Profil stehen im Line-up, darunter Nachtfalter Orchester. (3 direkte Treffer im Line-up) | stimmt |
| 3. Kiesel & Kobalt, Gießen | 0,859 | 1,000 | 0,718 | 0,000 | 0,000 | **0,737** | Weil du Kiesel & Kobalt 530-mal gehört hast. (Profil: Kiesel & Kobalt, 530 Scrobbles) | stimmt |
| 4. Lumen Delta, Köln | 0,800 | 0,746 | 1,000 | 0,000 | 0,000 | **0,699** | Weil du Lumen Delta 410-mal gehört hast. (Profil: Lumen Delta, 410 Scrobbles) | stimmt |
| 5. Glasfaser, Marburg | 0,573 | 0,950 | 1,000 | 0,300 | 0,000 | **0,671** | Weil Glasfaser deinem oft gehörten Nachtfalter Orchester nahesteht. (Last.fm-Ähnlichkeit 0.91 zu Nachtfalter Orchester) | stimmt |
| 6. Wellenreiter, Frankfurt am Main | 0,549 | 0,895 | 0,999 | 0,300 | 0,000 | **0,648** | Weil Wellenreiter deinem oft gehörten Kiesel & Kobalt nahesteht. (Last.fm-Ähnlichkeit 0.83 zu Kiesel & Kobalt) | stimmt |
| 7. Orbit Chor, Marburg | 0,641 | 0,950 | 0,790 | 0,000 | 0,000 | **0,629** | Weil du Orbit Chor 150-mal gehört hast. (Profil: Orbit Chor, 150 Scrobbles) | stimmt |
| 8. Die Fernen Freunde, Köln | 0,626 | 0,746 | 1,000 | 0,000 | 0,000 | **0,612** | Weil du Die Fernen Freunde 95-mal gehört hast. (Profil: Die Fernen Freunde, 95 Scrobbles)<br>Die Fernen Freunde war 2023 in deinen Top 20, seitdem nicht mehr. (zuletzt stark 2023) | stimmt |
| 9. Morgengrau, Gießen | 0,522 | 1,000 | 0,593 | 0,300 | 0,000 | **0,595** | Weil Morgengrau deinem oft gehörten Nachtfalter Orchester nahesteht. (Last.fm-Ähnlichkeit 0.74 zu Nachtfalter Orchester) | stimmt |
| 10. Polarlicht Kollektiv, Frankfurt am Main | 0,622 | 0,895 | 0,665 | 0,000 | 0,000 | **0,589** | Weil du Polarlicht Kollektiv 80-mal gehört hast. (Profil: Polarlicht Kollektiv, 80 Scrobbles) | stimmt |

Zwei von Hand nachgerechnet:

- Nr. 1: 0,5 × 1 + 0,2 × 0,895 + 0,15 × 1 = 0,829. Profilnähe 1,0 = Grundwert direkter Artist 0,6 + 0,4 × Gewicht 1,0 (meistgehörter Artist).
- Nr. 5: Profilnähe 0,573 = Grundwert ähnlicher Artist 0,3 + 0,3 × Ähnlichkeit 0,91. Score 0,5 × 0,573 + 0,2 × 0,95 + 0,15 × 1 + 0,15 × 0,3 = 0,672 (gerundet 0,671 wegen ungerundeter Einzelwerte). Entdeckung 0,3 ist begründet, weil Glasfaser nicht in deinem Profil steht, aber über Nachtfalter Orchester angrenzt.

Was die Stichprobe **nicht** zeigt: Genre-Begründungen und angrenzende Genres kommen in den Top 10 nicht vor, weil Artist-Treffer stärker sind. Beide sind in `src/domain/scoring.test.ts` gegen den Treffer geprüft.

## 4. Datenquellen und Schriften

| Quelle | Wofür | Kosten | Lizenz, Bedingungen | Attribution in der App | Beleg |
|---|---|---|---|---|---|
| Ticketmaster Discovery API v2 | Termine, Venues, Preise, Ticketlinks | kostenlos, 5000 Aufrufe/Tag, 5/s | nicht kommerziell, Caching nur angemessen (bei uns 6 h), Datenschutzhinweis Pflicht | `/quellen`, Footer-Link „Quellen und Datenschutz“ | [Terms](https://developer.ticketmaster.com/support/terms-of-use/), [Getting Started](https://developer.ticketmaster.com/products-and-docs/apis/getting-started/), geprüft 2026-09-26 |
| Last.fm API | Hörprofil, Ähnliche, Hörerzahlen | kostenlos | nicht kommerziell, öffentlicher Betrieb nur mit schriftlicher Freigabe, Bilder ausgenommen | `/quellen` als Textlink „powered by AudioScrobbler“, Artist-Links auf last.fm | [API ToS](https://www.last.fm/api/tos), geprüft 2026-09-26 |
| MusicBrainz | MBIDs, Genres | kostenlos, 1 Anfrage/s | Kerndaten CC0, Genres CC BY-NC-SA 3.0 | `/quellen` mit Lizenzlink | [Data License](https://musicbrainz.org/doc/About/Data_License), geprüft 2026-09-26 |
| Nominatim (OpenStreetMap) | Koordinaten für Venues ohne eigene Angabe | kostenlos, 1 Anfrage/s | ODbL, Nutzungsrichtlinie | `/quellen` „© OpenStreetMap-Mitwirkende, ODbL“ (bei der Abnahme ergänzt, fehlte) | [Usage Policy](https://operations.osmfoundation.org/policies/nominatim/), geprüft 2026-09-26 |
| Eigene Liste `data/curated-events.json` | Festivals, Clubtermine von Hand | kostenlos | deine Daten | nicht nötig | `data/README.md` |
| ICS-Kalender `data/feeds.json` | Venue-Kalender, die du selbst einträgst | kostenlos | je Kalender prüfen | je nach Kalender | `data/README.md` |

| Schrift | Rolle | Lizenz | Beleg |
|---|---|---|---|
| Uncut Sans | Text und Bedienung | SIL OFL 1.1 | `node_modules/@fontsource/uncut-sans/LICENSE`, https://uncut.wtf/sans-serif/uncut-sans.html |
| Archivo (variabel, Breite 125) | Regalköpfe | SIL OFL 1.1 | `node_modules/@fontsource-variable/archivo/LICENSE`, https://github.com/Omnibus-Type/Archivo |

Beide lokal eingebunden, kein Aufruf an Google Fonts oder andere Server. Details in `LIZENZEN.md`.

## 5. Lückenliste

Streng, sortiert nach Gewicht.

1. **Kriterium 1 ist seit Fynns Lauf erfüllt.** Weiter ungeprüft sind drei Annahmen aus Etappe 2 ungeprüft: ob `tag.getSimilar` Daten liefert (sonst greift der Ersatzweg), ob die Jahrescharts für „Wiedersehen“ den Zeitraum einhalten (`/debug/profil` zeigt das), und wie viele Ticketmaster-Termine einen Profilbezug haben.
2. **Clubszene fehlt.** Einzige freie Event-API ist Ticketmaster. Eigene Liste und ICS-Kalender helfen nur mit Handarbeit.
3. **Wikidata ist nicht angebunden.** Geplant für Gründungsjahr von Festivals (Ansicht „New“, Erstausgabe) und Venue-Kapazität. „New“ nutzt deshalb nur „zum ersten Mal gesehen“, Größen sind aus dem Venue-Namen geschätzt und so markiert.
4. **Merch-Links nur aus der eigenen Liste.** Ticketmaster hat kein Merch-Feld, das ich belegen konnte; eine freie Merch-Quelle gibt es nicht.
5. **Artist-Seite kennt nur den geladenen Bestand** (300 km um dein Zuhause plus Artist-Suche in Nachbarländern), keine komplette Welttour.
6. **Favorisierte Genres und Artists beeinflussen den Score nicht**, nur „Neu seit deinem letzten Besuch“. Bewusst, weil das eine neue Score-Komponente mit eigener Begründung bräuchte.
7. **„Neu seit deinem letzten Besuch“ zählt Besuche der Profilseite**, nicht der ganzen App, und hängt am Browser.
8. **Zeitspanne**: Es gibt Datum von/bis und die Ansichten Woche/Monat/Jahr, aber keine Schnellwahl wie „nächste 30 Tage“ in der Filterleiste.
9. **Last.fm-Button**: Die Attribution steht als Textlink, das offizielle Bild „powered by AudioScrobbler“ ist noch nicht eingebunden.
10. **Kein Screenreader-Durchlauf** durch mich, nur axe und Tastaturmessung. Deine Prüfliste steht oben.
11. **Zweite Sprungmarke „Zu den Ergebnissen“** fehlt, siehe Tastaturdurchlauf.
12. **Datumsfelder** zeigen das Format des Browsers (in einem englisch eingestellten Browser „mm/dd/yyyy“).

## 6. README

Aktualisiert: Einrichtung, alle benötigten Keys mit Herkunft, Start- und Offline-Befehl, Seitenübersicht, Caching, Prüfbefehle, Ordner, Grenzen der Stufe 1.

## 7. Vorbereitung für Stufe 2 und 3

Keine Umsetzung, nur Einschätzung.

**Stufe 2 (Konto, Cloud, Benachrichtigungen)**

Schon da:
- Favoriten folgen dem `Favorites`-Typ mit Versionsfeld und `lastSeenAt`, Export/Import als JSON. Der Umzug in eine Datenbank ist ein Import dieser Datei.
- Scoring und Begründungen sind reine Funktionen ohne Browser- oder Netzabhängigkeit, laufen also genauso auf einem Server oder in einem nächtlichen Job.
- Das „zuerst gesehen“-Register (`.cache/first-seen.json`) ist der Kern jeder Benachrichtigung: neue Termine für favorisierte Artists sind genau die Differenz, die die Profilseite heute schon berechnet.
- Alle Keys liegen serverseitig, nichts muss aus dem Client heraus.

Fehlt:
- Anmeldung und Nutzer*innen-ID; `Favorites` hat noch kein Besitzerfeld, Heimatort und Filter liegen im Browser.
- Datenbank statt Plattencache, Cache-Schlüssel sind heute nicht nach Person getrennt.
- Ein geplanter Job, der Termine lädt, vergleicht und verschickt, plus Push- oder Mail-Dienst (kostenlos und frei muss noch gefunden werden).
- Rechtlich: schriftliche Freigabe von Last.fm für öffentlichen Betrieb, Datenschutzerklärung, und die nicht-kommerzielle Bindung aller Quellen.

**Stufe 3 (Blend mit anderen Nutzer\*innen und Gruppen)**

Schon da:
- `TasteProfile` ist pro Person gebaut und trägt den Namen; `matchEvent` arbeitet gegen einen Profilindex, kann also mehrfach laufen.
- Begründungen sind typisiert, nicht als Text gespeichert, und lassen sich um eine Person erweitern.

Fehlt:
- Eine Regel, wie mehrere Treffer zu einem Gruppenscore werden (Mittelwert, Minimum, „niemand hasst es“). Das ist eine Produktentscheidung, keine technische.
- Der `Reason`-Typ braucht ein Feld „wer“, damit die Karte sagt „Weil Anna X 300-mal gehört hat und du Y“.
- Einwilligung, das eigene Profil mit anderen zu teilen, und eine Ansicht, was geteilt wird.

## Delegation in Etappe 5 und 6

- Filtertests (57) und Artist-Tests (25) an ein kleineres Modell delegiert, mit festen Vorgaben für Randfälle. Geprüft mit tsc, eslint, vitest und Stichprobe der Zeitzonen- und Mehrtagesfälle; einen falschen Kommentar (Uhrzeit) korrigiert, Tests selbst waren richtig.
- Selbst gemacht: Filterlogik, URL-Zustand, Suche, Artist-Seite, Favoriten, Profilseite, Gegenrechnung samt Tests, Tastatur- und axe-Prüfung, dieser Bericht.
