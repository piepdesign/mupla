# (C) Produktspezifikation — mupla

> **Stand:** 2026-09-26. Quelle: Fynns Projektbeschreibung vom 2026-09-26, geordnet nach Problematik → Strategie → Funktion.

## Problematik

Wer Musik über Streaming hört, weiß erstaunlich wenig darüber, wann die eigenen Artists in erreichbarer Nähe spielen. Die Information existiert, sie ist nur über Ticketplattformen, Instagram-Stories, Festival-Websites und Newsletter verteilt und jeweils an den Verkauf gekoppelt statt an den Geschmack. Streaming-Dienste kennen das Hörprofil, nutzen es aber nicht für Livemusik. Umgekehrt kennen Ticketplattformen das Angebot, aber nicht den Geschmack. Zwischen beidem liegt eine Lücke, in der Konzerte stattfinden, von denen man erst hinterher erfährt.

Dazu zwei Nebenprobleme: Entdeckung endet am Rand des eigenen Profils, und gemeinsame Konzertplanung in Freundeskreisen ist eine Gruppenchat-Angelegenheit ohne Datengrundlage.

## Strategie

Das Hörprofil ist der Filter, nicht das Angebot. mupla dreht die Richtung um: erst Geschmack, dann Events. Drei Hebel:

1. **Profil als Kuratierungsgrundlage.** [[Wiki/Organisationen/Last.fm|Last.fm]] liefert Top-Artists, Top-Tags, Scrobble-Verlauf und zeitliche Gewichtung (letzte Woche bis Allzeit). Daraus entsteht ein Geschmacksvektor aus Artists, Genres und Nachbarschaften.
2. **Begründete Empfehlung statt Trefferliste.** Jede Karte sagt, warum sie da ist. Das ist gleichzeitig Vertrauensmechanik und Entdeckungsfläche („weil du Bonobo hörst", „weil dieses Genre an deinem Profil angrenzt").
3. **Kontrollierte Grenzüberschreitung.** Ein einstellbarer Entdeckungsgrad mischt bewusst Angrenzendes dazu, statt das Profil zu spiegeln. Ohne diesen Regler wird jede Empfehlungs-App zur Echokammer.

## Zielbild in einem Satz

mupla nimmt das, was du sowieso hörst, und zeigt dir, wann und wo es live stattfindet, inklusive der Nachbarschaft, die du noch nicht kennst.

## Funktionsumfang nach Stufen

### Stufe 1 — Solo-MVP (das, was gebaut wird)

- **Profilanbindung:** Last.fm-Nutzername genügt (öffentliche API, kein OAuth nötig für Leseprofil). Spotify-Anbindung als späterer zweiter Adapter mitgedacht, nicht gebaut.
- **Profilanalyse:** Top-Artists und Top-Tags über mehrere Zeiträume, Gewichtung nach Scrobbles und Aktualität, abgeleitete Genre-Nachbarschaft über Last.fm `artist.getSimilar` und `tag.getSimilar` plus MusicBrainz-Genres.
- **Ansichten:** kanonische Regale (siehe [[03 Projekte/mupla/00 Konzept/(C) Ansichten & Filter|Ansichten & Filter]]).
- **Eventkarte:** Artist/Band, Event- oder Festivalname, Datum und Uhrzeit, Ort und Entfernung, Dauer bzw. Laufzeit (mehrtägig bei Festivals), Preisspanne, Genre-Tags, Line-up-Auszug, Begründungszeile, Link zum offiziellen Ticketverkauf und, wenn auffindbar, zu Merch.
- **Filter:** Land bzw. Länder, Entfernung, Preis, Größe (Club/Halle/Arena/Festival), Zeitraum und Zeitspanne, Genre, Wochentag.
- **Freie Suche:** über Artist, Genre, Ort, Event.
- **Genre-Entdeckung:** Genres durchsuchbar, auch wenn sie nicht im Profil vorkommen.
- **Artist-Seite:** alle kommenden Termine eines Artists, aufgeschlüsselt nach eigener Tour, Gastauftritt auf einem Event, Festival-Line-up.
- **Favoriten:** Artists, Genres, Events und Festivals favorisierbar; chronologische Übersicht der favorisierten Termine. Speicherung lokal (Browser-Speicher plus JSON-Export, damit ein späterer Cloud-Umzug verlustfrei geht).
- **Neuigkeiten passiv:** beim Aufruf wird geprüft, ob zu Favoriten neue Termine dazugekommen sind, und im Profil als Liste „Neu seit deinem letzten Besuch" gezeigt. Push kommt erst mit Stufe 2.

### Stufe 2 — Konto und Cloud (dokumentiert, nicht gebaut)

Auth, serverseitige Favoriten, echte Benachrichtigungen (E-Mail oder Web-Push), Kalender-Export (ICS), Merkliste über Geräte hinweg.

### Stufe 3 — Blend und Gruppen (dokumentiert, nicht gebaut)

Verbindung mit anderen Nutzer\*innen und Gruppen, zwei Modi:

- **Schnittmenge** — Events, die auf gemeinsamen Geschmack einzahlen. Ranking nach Überschneidung.
- **Brücke** — Events, die unterschiedliche Profile verbinden: ein Festival, dessen Line-up mehrere getrennte Geschmäcker je einzeln bedient. Rechnerisch die interessantere Hälfte, weil sie Line-ups gegen Profile abgleicht statt Artists gegen Artists.

## Abnahmekriterien Stufe 1

Erst wenn alle fünf Punkte stimmen, ist Stufe 1 ausgeliefert:

1. Mit Fynns Last.fm-Namen erscheinen ohne manuelle Eingabe echte, zukünftige Events, die zum Profil passen.
2. Jede Karte trägt eine wahre Begründung, die auf konkrete Profildaten zurückführt.
3. Alle Filter wirken kombiniert und ohne Neuladen.
4. Kontrast, Tastaturbedienung und Fokus erfüllen WCAG AA; Farbe ist nie allein informationstragend.
5. Keine Datenquelle kostet Geld, und alle Ticketlinks führen auf offizielle Verkaufsstellen.

## Bewusst nicht Teil des Projekts

Kein eigener Ticketverkauf, kein Zweitmarkt, kein Musikstreaming in der App, keine Scrobble-Schreibrechte, keine Social-Feed-Mechanik über die Blend-Funktion hinaus.
