# All-Platform Video Downloader Frontend

Created for **MR.THARU BOY**

## Files
- `index.html`
- `style.css`
- `script.js`

## Run locally
You can open `index.html` directly in a browser, or use a simple local server.

Example with Python:
```bash
python -m http.server 8080
```

Then open:
`http://localhost:8080`

## Demo mode
`script.js` uses:

```js
DEMO_MODE: true
```

This means the UI works with mock metadata and format options.

## Backend integration
Change:

```js
DEMO_MODE: false
API_BASE_URL: "https://your-backend.example.com/api"
```

Expected API contract:

### POST /api/analyze
Request:
```json
{
  "url": "https://example.com/video"
}
```

Response:
```json
{
  "id": "abc123",
  "title": "Example video",
  "thumbnail": "https://cdn.example.com/thumb.jpg",
  "duration": "03:42",
  "platform": "YouTube",
  "author": "Creator",
  "formats": [
    {
      "id": "mp4-1080",
      "kind": "video",
      "label": "1080p",
      "ext": "MP4",
      "size": "84 MB",
      "note": "Best quality"
    },
    {
      "id": "mp3-320",
      "kind": "audio",
      "label": "320 kbps",
      "ext": "MP3",
      "size": "8.7 MB",
      "note": "High quality audio"
    }
  ]
}
```

### POST /api/download
Request:
```json
{
  "mediaId": "abc123",
  "formatId": "mp4-1080"
}
```

Response:
```json
{
  "downloadUrl": "https://your-backend.example.com/download/temporary-signed-url"
}
```

## Production recommendations
- Keep API keys and downloader credentials on the server.
- Add rate limiting, request logging, validation, abuse prevention, and CORS restrictions.
- Return short-lived signed download URLs.
- Never put private RapidAPI/API credentials inside `script.js`.
- Follow platform terms, copyright law, and download only content you are authorized to save.
- If using a server-side media tool, configure it only for lawful content and do not bypass DRM or access controls.
