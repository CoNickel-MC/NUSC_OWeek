# NUSC OWeek Live Scores Manual

This website is a live scoreboard for NUSC OWeek house points. It shows each house score, the total score, a liveliness meter, and an Ollie image that gets clearer as the total score increases.

The website has two parts:

- **Frontend**: the page you open in the browser.
- **Backend**: the Node.js server that stores scores, receives updates, and broadcasts live changes.

When a score changes, the backend sends the update to every open browser tab through WebSocket, so the scoreboard updates immediately without refreshing.

## What This Website Does

- Shows live scores for the six houses: Corvex, Osceanna, Idalia, Levios, Kairos, and Perseus.
- Shows the total score and liveliness meter.
- Makes Ollie progressively clearer as the liveliness meter charges up.
- Saves scores and update history in `data/scores.json`.
- Provides API endpoints that a Telegram bot can call later.
- Includes a small on-page Controls panel for local testing.

## How To Run It

If `node` or `npm` is not recognized, install Node.js LTS:

```powershell
winget install --id OpenJS.NodeJS.LTS -e
```

After installing, close and reopen VS Code or PowerShell. Then check:

```powershell
node --version
npm --version
```

Run the website:

```powershell
cd "C:\Users\yujix\OneDrive\Documents\NUS\Y1S2\Orbital\NUSC_OWeek"
$env:AUTH_USERS="your_telegram_username,another_admin"
npm install
npm start
```

Open this in your browser:

```text
http://localhost:3000
```

## How Scores Are Updated

The backend only accepts score updates from usernames listed in `AUTH_USERS`.

For testing, the default allowed username is:

```text
your_telegram_username
```

To use your real Telegram username, start the server like this:

```powershell
$env:AUTH_USERS="your_telegram_username,another_admin"
npm start
```

Use Telegram usernames without the `@` symbol. The backend is case-insensitive.

Accepted team values are:

```text
h1, h2, h3, h4, h5, h6
```

or house names such as:

```text
Corvex, Osceanna, Idalia, Levios, Kairos, Perseus
```

### On-Page Controls

Open `http://localhost:3000`, then click **Controls** at the bottom-right of the page.

You can:

- enter an authorized username
- choose a house
- add points
- undo the latest score update

These controls call the real backend API, so they behave the same way a Telegram bot request would.

## How The Telegram Bot Links To It

The Telegram bot lives in the sibling `O-Week_TelegramBot` repository. It sends score updates to this backend through the API below.

The intended flow is:

1. A referee sends a Telegram command, for example:

```text
/add Corvex 35
```

2. The Telegram bot reads:

```text
username = sender's Telegram username
team = Corvex
points = 35
```

3. The bot sends a POST request to the website backend:

```http
POST /api/score
```

with this JSON body:

```json
{
  "username": "your_telegram_username",
  "team": "Corvex",
  "delta": 35
}
```

4. The backend checks that the username is authorized.

5. The backend updates `data/scores.json`.

6. The backend broadcasts the new score to all open scoreboards through WebSocket.

7. The website animates the score change automatically.

For local testing, run the Telegram bot from the sibling folder:

```powershell
cd "C:\Users\yujix\OneDrive\Documents\NUS\Y1S2\Orbital\O-Week_TelegramBot"
$env:TELEGRAM_BOT_TOKEN="your_bot_token"
$env:AUTH_USERS="your_telegram_username,another_admin"
$env:BACKEND_URL="http://localhost:3000"
.\gradlew.bat run
```

For deployment later, set `BACKEND_URL` to the live server URL instead of `localhost`.

## API Reference

### Add Score

```http
POST /api/score
```

Body:

```json
{
  "username": "your_telegram_username",
  "team": "Corvex",
  "delta": 35
}
```

PowerShell test:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/score -ContentType "application/json" -Body '{"username":"your_telegram_username","team":"Corvex","delta":35}'
```

### Undo Latest Score Update

```http
POST /api/undo
```

Body:

```json
{
  "username": "your_telegram_username"
}
```

PowerShell test:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/undo -ContentType "application/json" -Body '{"username":"your_telegram_username"}'
```

### Reset Scores

```http
POST /api/reset
```

Start the server with an admin key:

```powershell
$env:ADMIN_KEY="some-secret"
npm start
```

Body:

```json
{
  "key": "some-secret",
  "username": "admin"
}
```

### Get Current Scores

```http
GET /api/scores
```

PowerShell test:

```powershell
Invoke-RestMethod http://localhost:3000/api/scores
```

### Health Check

```http
GET /api/health
```

PowerShell test:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

## Where Data Is Stored

Scores and history are saved in:

```text
data/scores.json
```

This means scores survive server restarts. If you want to fully clear local data during testing, stop the server and edit `data/scores.json` back to zero scores and an empty history.

## Ollie Reveal Image

The Ollie clarity effect uses:

```text
assets/ollie.jpg
```

The browser removes the white background at runtime, then reduces blur and increases saturation as the liveliness meter fills.

## Common Problems

### `npm` is not recognized

Node.js is either not installed, or your terminal has not refreshed after installation.

Try closing and reopening VS Code or PowerShell. If it still fails, install Node.js:

```powershell
winget install --id OpenJS.NodeJS.LTS -e
```

### Unauthorized username

The username used in the request is not listed in `AUTH_USERS`.

Start the server with the correct username:

```powershell
$env:AUTH_USERS="your_actual_telegram_username"
npm start
```

### Score changes do not appear in the browser

Make sure the server is running and the page was opened from:

```text
http://localhost:3000
```

Do not open `index.html` directly from the file system, because WebSocket updates need the backend server.

### Scores came back after restarting

That is expected. Scores persist in `data/scores.json`.
