# Corporate Mazdur — Hindi YouTube Radio

Pure HTML + CSS + JavaScript.

## Catalogue
- 133 Hindi song records from the supplied source data.
- Each song keeps its supplied YouTube `videoId`.

## Local run
Open `index.html` with VS Code Live Server.

## GitHub Pages

The player uses the official YouTube IFrame API (`YT.Player`) and does not manually construct the YouTube `/embed/` URL.

## YouTube playback note
This build follows the reference sites' architecture: it uses the official YouTube IFrame API, creates the player with `new YT.Player(...)`, passes `origin: window.location.origin`, and switches videos with `loadVideoById()`. The parent page also uses `strict-origin-when-cross-origin`.

Important: a YouTube video can be playable on youtube.com but still be unavailable to an embedded player on a different domain. This code cannot bypass YouTube's embedding restrictions. When an upload fails, the player tries that song's configured fallback IDs and then advances to the next song.
