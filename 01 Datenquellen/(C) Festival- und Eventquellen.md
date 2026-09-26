# Weitere Eventquellen (Feinschliff 2, Punkte 3 und 4)

Stand 2026-09-26. **Selbst geprüft** heißt, dass ich die Primärquelle an diesem Tag selbst gelesen habe. Alles andere stammt aus einer delegierten Recherche und nennt die Quelle. **Unbestätigt** heißt, dass die Seite im Sandbox-Proxy blockiert war (403) und nicht gelesen werden konnte.

## Preise hinter dem Tickets-Link (Punkt 3)

Der Link selbst enthält keine Preise. Er führt auf die Ticketmaster-Seite, die die Preise erst beim Aufruf anzeigt. Um sie zu übernehmen, müsste mupla diese Seite auslesen, also scrapen.

- **Scraping:** fällt weg. Die API-Nutzungsbedingungen (Stand 27.06.2023, https://developer.ticketmaster.com/support/terms-of-use/) verbieten unter anderem das Nachbauen des Ticketmaster-Angebots. Die AGB von ticketmaster.de waren blockiert und sind unbestätigt. Wir folgen dem Vorsichtsprinzip.
- **Event Details:** liefert dieselben `priceRanges` wie die Suche, also keinen Gewinn.
- **Inventory Status API:** hat Preise, gilt aber nur für „authorized clients only“ und ist eine Partner-API (https://developer.ticketmaster.com/products-and-docs/apis/inventory-status/). Nicht nutzbar.
- **Commerce API (Offers):** Es ist unbestätigt, ob sie mit einem Standard-Key Preise liefert. Das lässt sich nur mit Fynns Key am Mac testen.

**Stand:** Wenn `priceRanges` fehlt, lässt mupla den Preis weg.

## Festival-Listen

| Quelle | Befund | Verdikt |
|---|---|---|
| festivalticker.de | Nimmt Einträge von Veranstalter\*innen entgegen. Hat eine eigene XML-API unter http://api.festivalticker.de/ (Unterseiten zu AGB, Aufruf und Parametern). AGB, Kosten und Freigabe sind unbestätigt (403). | Vielversprechend. Blockiert, bis die AGB gelesen sind |
| festival-alarm.com | Keine Schnittstelle. Laut Impressum sind die Inhalte urheberrechtlich geschützt. | Nicht nutzbar |
| festivalhopper.de | Redaktion plus Einreichungen, keine Schnittstelle. Die robots.txt sperrt sogar den Feed. | Nicht nutzbar |

## Große Portale

| Quelle | Befund | Verdikt |
|---|---|---|
| Eventim | Nur Affiliate (Awin, CTS-Partnerprogramm), keine öffentliche API | Nicht nutzbar |
| Eventbrite | Die Suche nach Ort ist seit 20.02.2020 abgeschaltet: „all requests to the Event Search API will be denied“ (selbst geprüft: https://github.com/Automattic/eventbrite-api/issues/83) | Nicht nutzbar |
| Rausgegangen | Keine öffentliche API, die „Zentrale“ ist nur für Veranstalter\*innen. AGB unbestätigt. | Nicht nutzbar ohne schriftliche Zustimmung |
| Resident Advisor | Die AGB verbieten Scraper ohne schriftliche Erlaubnis (https://ra.co/terms) | Nicht nutzbar |
| Bandsintown | App-ID nur für Künstler\*innen (https://corp.bandsintown.com/data-applications-terms) | Nicht nutzbar |
| Songkick | Nur gegen Lizenzgebühr (https://www.songkick.com/developer) | Nicht nutzbar |
| Dice, Reservix, Meetup, Skiddle | Partnerzugang, Antrag, Pro-Abo oder nur UK | Nicht nutzbar |

## Nutzbare oder offene Kandidaten

| Quelle | Befund | Verdikt |
|---|---|---|
| **Eventfrog** | Jedes Konto kann einen Public-API-Key „with a single click“ anlegen, eine Freigabe wird nicht erwähnt. Der Key gibt Lesezugriff auf öffentliche Events. Limit: 30 Anfragen pro Minute und 2.000 pro Tag. Das Ablaufdatum setzt man selbst, vor dem Ablauf kommen Erinnerungen (selbst geprüft: https://eventfrog.ch/en/help/organizer/settings/api/api-keys.html). Die Endpunkte unter https://docs.api.eventfrog.net/ sind hier nicht lesbar, weil die Seite per JavaScript lädt. Unbestätigt ist außerdem, wie gut Deutschland abgedeckt ist, denn der Schwerpunkt liegt in der Schweiz. | **Eingebaut (2026-09-26).** Die Endpunkte sind über Fynns Screenshots der API-Referenz belegt (OpenAPI 3.0.3, Stand 31.08.2026): Server `https://api.eventfrog.net`, Bearer-Token, `GET /public/v1/events` mit `lat`, `lng`, `r`, `from`, `to`, `country`, `rubId`, `page` und `perPage` (höchstens 1000). Dazu kommen `/public/v1/locations` und `/public/v1/rubrics`. Bild-URLs dürfen laut Doku nicht direkt eingebunden werden. |
| Wikidata | CC0, hat ein Modell für einzelne Festival-Ausgaben. Termine sind vermutlich lückenhaft. | Nur für Stammdaten |
| setlist.fm | Nur vergangene Setlists | Nur als Signal |
| Content Hub Hessen | API-Key per Antrag mit Projektbeschreibung | Unklar, wäre ein Antrag |
| iCal-Feeds einzelner Venues | Legitim, wenn die Venue den Feed selbst veröffentlicht | Pro Venue prüfen |
