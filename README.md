# NUSC_OWeek

This repository is a static frontend project.

## Run locally

### Option 1: PowerShell static server

From the repository folder:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\serve.ps1 -Port 8000
```

Open `http://localhost:8000/` in your browser.

### Option 2: Node/npm static server

If you have Node.js installed:

```powershell
cd "C:\Users\yujix\OneDrive\Documents\NUS\Y1S2\Orbital\NUSC_OWeek"
npm install
npm start
```

Then open `http://localhost:8000/`.

## Files

- `index.html` — main page
- `script.js` — frontend logic
- `stye.css` — page styles
- `serve.ps1` — lightweight PowerShell static server
- `NUSC_OWeek.code-workspace` — VS Code workspace file for this project
