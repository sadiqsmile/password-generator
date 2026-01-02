# (SK) Password Generator

A responsive password generator built with **HTML, CSS, and vanilla JavaScript**.

## Features

- Password length slider (4–32)
- Uppercase / lowercase / numbers / symbols options
- Ensures at least one character from each selected category
- Secure random generation using `crypto.getRandomValues`
- Copy-to-clipboard button with feedback
- Top bar shows **current date/time** and **current weather** (uses browser location)

## Run locally

Just open `index.html` in a browser.

If you prefer a local server:

```bash
python -m http.server 5500
```

Then visit:

- http://localhost:5500/

## Publish on GitHub Pages

1. Create a new GitHub repository (example: `password-generator`).
2. Push these files to the repo:
   - `index.html`
   - `style.css`
   - `script.js`
   - `README.md`
3. In GitHub: **Settings → Pages**
4. Under **Build and deployment**:
   - **Source**: Deploy from a branch
   - **Branch**: `main`
   - **Folder**: `/(root)`
5. Save — GitHub will show your site URL after a minute.

## Notes

- Weather requires location permission in the browser.
