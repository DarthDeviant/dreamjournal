# Project: DREAM_JOURNAL.EXE

## What This Is
A browser-based encrypted dream journal. Entries are stored in Supabase (AES-256-GCM encrypted).
A local Python proxy (`server.py`) bridges the frontend to the Claude API at `localhost:8082`.

## Files
- `dream_journal.html` — the entire frontend (single-file app)
- `patch.js` — injected script adding Calendar, Dream Analyzer, and 2-line Summarizer features
- `server.py` — local uvicorn proxy server (bridges frontend → Claude API)
- `start.sh` — launches the proxy automatically

## Commands
- Start proxy: `uv run uvicorn server:app --host 0.0.0.0 --port 8082`
- Or just: `bash start.sh`

## Architecture
- Frontend talks to Supabase REST API directly for storage
- Frontend talks to `localhost:8082/v1/messages` for Claude (summary + analysis)
- `patch.js` is loaded as a `<script>` tag before `</body>` in the HTML
- All crypto lives in the browser (PBKDF2 key derivation, AES-GCM encrypt/decrypt)

## Code Style
- Vanilla JS only — no build step, no bundler
- Single-file approach: CSS, HTML, and JS all in `dream_journal.html`
- `patch.js` is an IIFE so it never pollutes the global scope
- Use the existing CSS variable system (`--ink`, `--paper`, `--rule-dark`, etc.) for any new UI
- Match the monospace terminal aesthetic throughout

## Rules
- NEVER modify the Supabase URL or anon key
- NEVER break the existing crypto functions (`encStr`, `decStr`, `deriveKey`)
- NEVER add external JS dependencies — keep it dependency-free in the browser
- Always test that the proxy error message still appears if `localhost:8082` is unreachable
- Keep `patch.js` self-contained — it must work by dropping one `<script>` tag into the HTML
