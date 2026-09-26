# (C) Design-Direktion — mupla

> **Stand:** 2026-09-26. Grundlage: Fynns Gestaltungsvorgabe und die beiden Referenzsammlungen in `Raw Sources/` (Festivalgestaltung, Spotify-Oberflächen). Alle Kontrastwerte unten sind gegen WCAG 2.1 gerechnet, nicht geschätzt.

## Gestalterische Ausgangslage

Die beiden Referenzen ziehen in verschiedene Richtungen, und genau dieser Spalt ist die Aufgabe:

- **Festivalplakate** arbeiten mit Lautstärke: gesättigte Zweifarbigkeit, verzerrte und gedehnte Schrift, geometrische Raster gegen organische Formen, Riso- und Gradient-Anmutung, bewusst nonkonforme Satzachsen. Sie müssen aus zehn Metern funktionieren und dürfen anstrengend sein.
- **Spotify-Oberflächen** arbeiten mit Ruhe im Rahmen und Lautstärke im Inhalt: dunkler neutraler Träger, ein Akzent, und die Farbe kommt aus dem Bildmaterial und wechselnden Kachelpaletten (Wrapped, Discover Weekly). Sie müssen stundenlang funktionieren und dürfen nie anstrengend sein.

**Die Entscheidung: Rahmen ruhig, Inhalt laut.** Navigation, Filter, Typohierarchie und Abstände sind streng, neutral und vorhersehbar. Die Energie sitzt in den Karten, Regalköpfen und Begründungszeilen, wo sie pro Genre, Ansicht und Event wechselt. Damit bleibt der visuelle Ausbruch an der Stelle, wo er inhaltlich etwas bedeutet, statt überall gleichzeitig.

## Farbsystem

### Träger

| Token | Hex | Rolle |
|---|---|---|
| `ink` | `#0B0B0F` | Grundfläche dunkel, Textfarbe auf hellen Flächen |
| `paper` | `#F4F1EA` | Grundfläche hell, Textfarbe auf dunklen Flächen |
| `ink-soft` | `#17171F` | Kartenfläche auf dunkler Grundfläche |
| `line` | `#2A2A35` | Trennlinien, Umrisse |

`ink` auf `paper` ergibt **17,4:1**. Der Träger ist damit nie das Problem, egal welcher Akzent dazukommt.

### Akzentpaletten

Statt einer Markenfarbe gibt es **Akzentpaare, die pro Ansicht und Genre rotieren** (die Spotify-Kachellogik, aber mit Festivalsättigung). Jede Farbe hat eine feste Regel, mit welcher Textfarbe sie kombiniert werden darf. Diese Regel ist nicht verhandelbar, sie ist der Grund, warum das System barrierefrei bleibt, obwohl es bunt ist.

| Token | Hex | Textfarbe darauf | Kontrast | Einsatz |
|---|---|---|---|---|
| `acid` | `#D7F25C` | nur `ink` | 15,7:1 | Fläche, Regalköpfe, Primärknopf |
| `cyan` | `#22D3EE` | nur `ink` | 10,9:1 | Fläche, Marker |
| `amber` | `#FFB703` | nur `ink` | 11,3:1 | Fläche, „Letzte Chance" |
| `electric` | `#3B2BF5` | nur `paper`/weiß | 7,4:1 | Fläche, Entdeckungs-Ansichten |
| `violet` | `#6D28D9` | nur `paper`/weiß | 7,1:1 | Fläche, Festivalsaison |
| `deep-green` | `#0F5132` | nur `paper`/weiß | 9,4:1 | Fläche, Favoriten |
| `plum` | `#2A1A4A` | nur `paper`/weiß | 15,6:1 | dunkle Kartenfläche mit Farbstich |
| `coral` | `#FF5A3C` | nur `ink` | 6,3:1 | Akzent, Hinweise |
| `magenta` | `#E0218A` | **kein Kleintext** | 4,4:1 gegen weiß | nur Grafik, Flächen, Schrift ab 24 px fett |

Verbindliche Regeln:

1. **Farbe ist nie allein informationstragend.** Status (ausverkauft, Vorverkauf, abgesagt) trägt immer zusätzlich Text oder Symbol.
2. **Gradienten nur als Fläche hinter Bild oder Großschrift**, niemals hinter Fließtext. Der Kontrast wird gegen den *schwächsten* Punkt des Gradienten gerechnet, nicht gegen den Durchschnitt.
3. **Maximal zwei Akzente pro Bildschirmfläche.** Rotation passiert zwischen Regalen, nicht innerhalb einer Karte.
4. **Fokusring** ist ein eigener Token (`acid` auf dunkel, `electric` auf hell), 2 px, 2 px Abstand, immer sichtbar, niemals per CSS entfernt.
5. Jede neue Kombination wird **vor** dem Einbau durch den Kontrast-Prüfer im Repo geschickt. Das Skript liegt bei, damit die Regel nachprüfbar statt gut gemeint ist.

## Typografie

Hauptschrift: **SansSerif, frei lizenziert.** Keine Schrift ohne dokumentierte Lizenz.

| Rolle | Vorschlag | Lizenz (zu bestätigen) | Begründung |
|---|---|---|---|
| Hauptschrift UI | **Uncut Sans** | frei/Open Source | neutral-zeitgemäße Grotesk, sehr gute Zifferndarstellung, wirkt nicht nach Standard-Webfont |
| Alternative UI | **Instrument Sans** oder **Geist Sans** | OFL / SIL | wenn Uncut Sans in den Schnitten zu dünn besetzt ist |
| Display / Regalköpfe | **Archivo Expanded** (Schnitt Black) oder **Bricolage Grotesque** | OFL | liefert die gedehnte Plakatanmutung der Festivalreferenz, ohne eine zweite Stilwelt aufzumachen |
| Zahlen / Daten | Tabellenziffern der Hauptschrift | — | Datum, Preis, Entfernung müssen in Listen untereinander stehen |

Regeln: höchstens zwei Familien. Display nur ab 28 px und nur für Kurztext. Fließtext mindestens 16 px, Zeilenlänge 60 bis 75 Zeichen, Zeilenabstand 1,5. Kein Text in Versalien über drei Wörter hinaus. Displayschrift nie für Begründungszeilen, die müssen lesbar sein, nicht laut.

## Formsprache

- **Geometrisches Raster als Skelett:** klare Spalten, harte Kanten, wenig Radius (4 px), sichtbares Raster in Regalköpfen.
- **Organische Störung als Inhalt:** Blob-, Wellen- und Riso-Formen ausschließlich in Kartenhintergründen, Genre-Tags und leeren Zuständen. Sie dürfen über Kanten hinauslaufen, aber niemals über Text liegen.
- **Bewegung sparsam:** Übergänge unter 200 ms, kein Parallax, kein Autoplay. `prefers-reduced-motion: reduce` schaltet alle Bewegung ab, nicht nur einen Teil.
- **Bildmaterial** kommt aus den Provider-Daten und ist von schwankender Qualität. Deshalb: jede Karte muss auch **ohne Bild** vollständig funktionieren, das Bild ist Zugabe. Fallback ist eine generierte Fläche aus dem Genre-Akzentpaar plus Artistname in Displayschrift, kein graues Platzhalterrechteck.

## Kernkomponente: die Eventkarte

Eine Karte trägt in fester Reihenfolge: Datum, Artist oder Festivalname, Ort mit Entfernung, Laufzeit, Preisspanne (oder „Preis unbekannt"), bis zu drei Genre-Tags, **Begründungszeile**, Favoritenschalter, Knopf zum offiziellen Ticketverkauf.

Die Begründungszeile ist gestalterisch gleichberechtigt mit dem Namen, nicht Kleingedrucktes. Sie ist der Unterschied zwischen mupla und einer Ticketsuchmaschine, und wenn sie aussieht wie eine Fußnote, ist die Karte falsch gebaut.

## Barrierefreiheit als Abnahmekriterium

- Kontrast AA: 4,5:1 Fließtext, 3:1 Großtext und Bedienelemente.
- Vollständige Tastaturbedienung, logische Reihenfolge, sichtbarer Fokus, Sprungmarke zum Inhalt.
- Regale sind Listen mit Beschriftung, keine nackten `div`-Stapel; Filter sind echte Formularelemente mit Label.
- Zielflächen mindestens 44 × 44 px.
- Getestet wird mit Tastatur und einem Screenreader, nicht nur mit dem Auge.

Das passt zur Haltung der Marke: die Hausschrift von piep.design basiert auf [[Wiki/Themenseiten/Barrierearme Gestaltung|Atkinson Hyperlegible]]. Eine Anwendung, die barrierearm sein will und es dann nicht prüft, wäre hier die unglaubwürdigste Variante.
