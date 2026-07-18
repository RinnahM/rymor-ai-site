# Rymor AI — Vanilla HTML/CSS/JS

One file, no build step: `index.html` contains all the CSS and JS inline.
Open it directly in a browser, or serve it with any static server.

## Running it

**Easiest:** double-click `index.html`, or drag it into a browser tab.

**With live-reload (recommended while editing):** if you have the VS Code
"Live Server" extension, right-click `index.html` → "Open with Live Server."
Otherwise:

```bash
python3 -m http.server 5500
# then open http://localhost:5500
```

## Running the backend (contact form + chat widget)

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # fill in real Brevo + GEMINI_API_KEY
uvicorn main:app --reload --port 8000
```

`API_BASE_URL` near the bottom of `index.html`'s `<script>` is set to
`http://localhost:8000` — change it if you deploy the backend elsewhere, and
update `ALLOWED_ORIGINS` in `.env` to match wherever you're serving the HTML from.

## What's in this build

Everything from your original file, plus:

- **Services section** (`#services`) — four-discipline grid, between the
  marquee and the work grid.
- **Custom cursor** — a dot + trailing ring replacing the system arrow on
  desktop, growing over anything clickable. Auto-disabled on touch devices
  and for `prefers-reduced-motion`. See `initCustomCursor()`.
- **Grayscale-hover portrait** — the About photo sits near-grayscale by
  default, eases to full color on hover. Pure CSS (`.about-photo img`).
- **Contact form** — Name / Email / Company / message, posting to the
  FastAPI `/contact` endpoint (was CTA-buttons-only before).
- **AI chat widget** — floating bubble, bottom right. `CHAT_PERSONA_PROMPT`
  qualifies visitors and pushes them to your Calendly link once it looks like
  a fit. Talks to the FastAPI `/chat` endpoint, which proxies to Claude.

Everything else — the case study filter system, marquee, dark mode with
persistence, scroll reveal — is untouched from your original file.

## Where to edit things

Since it's one file, all the content lives in the `<script>` block near the
bottom of `index.html`, as plain JS objects:

- `SERVICES_DATA` — the service cards
- `CASE_DATA` — your case studies (already filled in with real content)
- `CHAT_PERSONA_PROMPT` — what the chat widget asks and when it pushes the call

No component files, no imports — change the text, save, refresh.
