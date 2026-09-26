# (C) Ansichten, Filter und Empfehlungslogik — mupla

> **Stand:** 2026-09-26. Ergänzt [[03 Projekte/mupla/00 Konzept/(C) Produktspezifikation|die Produktspezifikation]].

## Ansichten (Regale)

Jede Ansicht ist eine Sortier- und Filterkombination über demselben normalisierten Eventbestand, kein eigener Datentopf. Das hält die Datenschicht klein und macht neue Ansichten billig.

| Ansicht | Logik | Nutzen |
|---|---|---|
| **For You** | Gesamtscore aus Profilnähe × Erreichbarkeit × Zeitnähe | Startseite, das eine Regal, das alles kann |
| **Upcoming** | nächste Termine aufsteigend, gefiltert auf Profiltreffer | „was steht als Nächstes an" |
| **Nearby** | Entfernung von der Heimatkoordinate aufsteigend | Spontanentscheidung, Feierabend |
| **Popular** | Beliebtheit aus [[Wiki/Organisationen/Last.fm\|Last.fm]]-Hörerzahl des Artists plus Venue-Größe | Orientierung, große Namen |
| **New** | neu gegründete Festivals und Erstausgaben, plus neu angekündigte Tours | Erstausgaben sind oft billiger und kleiner |
| **This Week / Month / Year** | feste Zeitfenster | Planungshorizont |
| **Festivalsaison** | nur mehrtägige Events, nach Saisonfenster | Festivals brauchen Vorlauf und eigene Logik |
| **Grenzgänger** | bewusst außerhalb des Profils, aber an angrenzenden Genres | die Entdeckungsfläche, Gegenmittel zur Echokammer |
| **Wiedersehen** | Artists, die Fynn früher viel gehört hat und aktuell nicht | nutzt den Scrobble-Verlauf, den sonst niemand auswertet |
| **Letzte Chance** | Termine in Kürze mit noch verfügbaren Tickets | Dringlichkeit, ohne künstlich zu drängen |
| **Meine Favoriten** | favorisierte Artists, Genres, Events chronologisch | das eigene Profil als Kalender |

Erweiterbar, aber jede neue Ansicht braucht eine Frage, die sie beantwortet. Regale ohne Frage werden nicht gebaut.

## Filter

Filter sind orthogonal zu den Ansichten und bleiben beim Wechsel erhalten.

- **Land / Länder** — Mehrfachauswahl, Standard: Deutschland plus Nachbarländer.
- **Entfernung** — Radius von der Heimatkoordinate, Voreinstellung 150 km, Regler bis „egal".
- **Preis** — Ober- und Untergrenze; Events ohne bekannten Preis über einen Schalter ein- oder ausblenden, aber sichtbar als „Preis unbekannt" statt stillschweigend weg.
- **Größe** — Club, Halle, Arena, Open Air, Festival. Abgeleitet aus Venue-Kapazität, bei fehlender Angabe geschätzt und als geschätzt markiert.
- **Zeit** — fester Zeitraum, freie Zeitspanne, Wochentage, „nur Wochenende".
- **Genre** — aus dem Profil vorbelegt, frei erweiterbar auf alles.
- **Entdeckungsgrad** — Regler von „nur was ich höre" bis „überrasch mich". Steuert, wie viel Profilnähe im Score mindestens verlangt wird.

## Empfehlungslogik

Score je Event, transparent gehalten, damit die Begründung nicht gelogen ist:

```
score = w1 · profilnähe
      + w2 · erreichbarkeit
      + w3 · zeitnähe
      + w4 · entdeckungsbonus
      − w5 · preisreibung
```

- **Profilnähe** — direkter Artist-Treffer (höchster Wert), Similar-Artist-Treffer, Genre-Tag-Überschneidung, Line-up-Treffer bei Festivals (Summe der Einzeltreffer, gedeckelt, damit ein Festival mit 200 Acts nicht automatisch alles gewinnt).
- **Erreichbarkeit** — Entfernung, degressiv gewichtet: die ersten 50 km kosten fast nichts, ab 300 km bricht der Wert ein.
- **Zeitnähe** — nicht linear. Sehr nahe Termine sind unpraktisch, sehr ferne unverbindlich; Optimum liegt bei etwa vier bis zehn Wochen Vorlauf.
- **Entdeckungsbonus** — greift nur, wenn der Entdeckungsgrad hochgeregelt ist.
- **Preisreibung** — weicher Abzug bei Überschreitung der eingestellten Obergrenze, kein Hartfilter, sonst verschwinden Festivals mit Frühbucherpreisen.

Gewichte liegen als Konstanten an einer Stelle und sind später im Debug-Panel sichtbar. Regel: **Wenn sich eine Begründungszeile nicht aus dem Score ableiten lässt, ist die Begründung falsch.**

## Begründungszeilen (Muster)

- „Weil du **{Artist}** {n}-mal gehört hast."
- „Weil **{Artist}** deinem oft gehörten **{Ähnlicher Artist}** nahesteht."
- „{m} Acts aus deinem Profil stehen im Line-up, darunter **{Artist}**."
- „**{Genre}** grenzt an dein Profil an, du kennst es noch nicht."
- „**{Artist}** war 2024 in deinen Top 20, seitdem nicht mehr."

Nie „könnte dir gefallen" ohne Anker. Eine Begründung ohne Datenbezug ist Dekoration.
