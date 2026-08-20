# Corporate Mazdur — Hindi YouTube Radio

Pure HTML + CSS + JavaScript.

## Catalogue
- 133 Hindi song records from the supplied source data.
- Each song keeps its supplied YouTube `videoId`.
- Existing UI remains: Pick a mood, filter songs, click any song to play.

## Local run
Open `index.html` with VS Code Live Server.

## GitHub Pages
Deploy the `cm-src` folder contents to the repository used for:
`https://jhajibhaskar.github.io/cm/`

The player uses the official YouTube IFrame API (`YT.Player`) and does not manually construct the YouTube `/embed/` URL.


## YouTube fallback behavior
The 133-song catalogue stores the supplied primary YouTube ID for each song. The player now supports optional `fallbackVideoIds` per song. If a YouTube embed fails, the player tries configured alternates for that same song; if none work, it advances to the next track instead of leaving the UI stuck on “Video unavailable”.

To add verified alternate uploads, edit `src/songs.js` and add them to `CM_FALLBACKS` by song slug. Only use YouTube IDs that you have confirmed are embeddable.


### Verified fallback uploads
The catalogue supports multiple YouTube candidates per song. Verified candidates have been added where the supplied HindiGeetMala/YouTube research provided matching uploads. The player tries the primary ID first, then fallbackVideoIds, then advances. Unverified IDs are not fabricated.


## YouTube playback note
This build follows the reference sites' architecture: it uses the official YouTube IFrame API, creates the player with `new YT.Player(...)`, passes `origin: window.location.origin`, and switches videos with `loadVideoById()`. The parent page also uses `strict-origin-when-cross-origin`.

Important: a YouTube video can be playable on youtube.com but still be unavailable to an embedded player on a different domain. This code cannot bypass YouTube's embedding restrictions. When an upload fails, the player tries that song's configured fallback IDs and then advances to the next song.
