# Eigene Daten

Hier trägst du Termine ein, die keine freie Schnittstelle liefert. Beide Dateien sind JSON-Listen; eine leere Liste `[]` ist gültig.

## `curated-events.json`

Für Festivals mit Line-up nach Tag und Bühne oder Clubtermine, die bei Ticketmaster fehlen. Ein Eintrag:

```json
{
  "id": "weitwinkel-2027",
  "title": "Weitwinkel Festival",
  "kind": "festival",
  "startDate": "2027-06-18",
  "startTime": "14:00",
  "endDate": "2027-06-20",
  "venue": { "name": "Festivalwiese", "city": "Kassel", "country": "DE", "lat": 51.31, "lon": 9.48, "capacity": 8000 },
  "lineup": [
    { "name": "Artist A", "day": "2027-06-18", "stage": "Hauptbühne" },
    { "name": "Artist B", "day": "2027-06-19" }
  ],
  "genres": ["electronic", "ambient"],
  "price": { "min": 119, "currency": "EUR" },
  "ticketUrl": "https://offizielle-seite.example/tickets",
  "firstEditionYear": 2024,
  "sourceUrl": "https://offizielle-seite.example"
}
```

Pflicht: `id`, `title`, `startDate`, `venue.name`, `venue.city`, `venue.country`. Fehlerhafte Einträge erscheinen als Warnung auf `/debug/events`, sie werden nicht still verworfen.

## `feeds.json`

iCalendar-Feeds (`.ics`) einzelner Venues. Der Ort steht im Feed selten sauber drin, deshalb gibst du ihn hier einmal an:

```json
{
  "id": "beispielclub",
  "label": "Beispielclub Gießen",
  "url": "https://beispielclub.example/programm.ics",
  "venue": { "name": "Beispielclub", "city": "Gießen", "country": "DE", "lat": 50.58, "lon": 8.67, "capacity": 400 },
  "genres": ["indie"]
}
```

Prüf vor dem Eintragen, ob die Venue die Weiterverwendung ihres Kalenders erlaubt.
