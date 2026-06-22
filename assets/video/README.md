# Hero video

The homepage hero (`partials/site/header.htm`) plays `hero.mp4` from this folder as a
full-bleed autoplaying background, referenced via `{{ 'assets/video/hero.mp4'|theme }}`.

Drop the video here as `hero.mp4` (H.264 / MP4, muted-friendly). Recommended:
- 1920×1080 or larger, landscape
- a few MB, short seamless loop (the markup uses `autoplay muted loop playsinline`)

To use a different filename or add formats (e.g. WebM), update the `<source>` tag in
`partials/site/header.htm`.
