# Musikdienste als Geschmacksquelle

Stand 2026-09-26. **Selbst geprüft** heißt: am 26.09.2026 selbst auf der Primärquelle nachgelesen. Die übrigen Angaben stammen aus einer Recherche mit den genannten Quellen. **Unbestätigt** heißt: keine Primärquelle gefunden.

**Entscheidung Stufe 1:** Last.fm bleibt die einzige Geschmacksquelle. Andere Dienste kommen über Scrobbling bei Last.fm an und zählen dann automatisch mit. Direkte Konnektoren werden nicht gebaut.

| Dienst | API für Hörverlauf / Top-Artists | Frei nach unseren Regeln? | Scrobbelt direkt zu Last.fm? |
|---|---|---|---|
| Spotify | `/v1/me/top/{type}`, `/v1/me/player/recently-played` (OAuth) | **Nein.** Seit 11.02.2026 gilt: „All Development Mode apps require the app owner to have an active Spotify Premium subscription“. Dazu kommt ein Limit von 5 Nutzer\*innen pro App (selbst geprüft: https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide) | Ja (selbst geprüft) |
| Apple Music | `/v1/me/recent/played/tracks` | **Nein.** Der Developer Token setzt das kostenpflichtige Apple Developer Program voraus (https://developer.apple.com/documentation/applemusicapi/generating-developer-tokens) | Nein. Nur über Web Scrobbler oder Drittanbieter-Apps |
| Tidal | Keine. 2024 laut Maintainer nur „in Diskussion“ (https://github.com/orgs/tidal-music/discussions/32). Ob es 2026 anders ist, ist unbestätigt | nicht relevant | Ja (selbst geprüft) |
| YouTube Music | Keine offizielle API. Der Watch-History-Endpunkt der YouTube Data API ist seit 2016 leer (https://developers.google.com/youtube/v3/revision_history) | Nein | Nur die „YouTube website“ ist gelistet, für YT Music braucht es Web Scrobbler |
| Qobuz | Keine öffentliche API, Zugang nur als Partner (unbestätigt) | Nein | Nicht gelistet, nur über Player wie Roon |
| Deezer | App-Neuanlage laut Community-Beitrag vom 09.06.2026 ausgesetzt (unbestätigt, keine offizielle Aussage) | Nein | Ja (selbst geprüft) |
| SoundCloud | App-Registrierung braucht das kostenpflichtige Artist-Pro-Abo (https://developers.soundcloud.com/docs/api/register-app) | Nein | Ja, „SoundCloud website“ (selbst geprüft) |

Welche Dienste direkt zu Last.fm scrobbeln, steht unter https://www.last.fm/about/trackmymusic (selbst geprüft). Genannt sind Spotify, Tidal, Deezer, SoundCloud, Bandcamp, YouTube, Mixcloud, Sonos, Hype Machine, 8tracks und Pandora.
