const express = require('express');
const fs = require('fs');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || 'localhost';
const AUTHORIZED_USERS = (process.env.AUTH_USERS || 'your_telegram_username').split(',').map((u) => u.trim().replace(/^@/, '').toLowerCase()).filter(Boolean);
const ADMIN_KEY = process.env.ADMIN_KEY || 'change-me-in-production';
const DATA_DIR = path.join(__dirname, 'data');
const STATE_FILE = path.join(DATA_DIR, 'scores.json');
const DEFAULT_SCORES = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };
const TEAM_ALIASES = { h1: 'h1', corvex: 'h1', h2: 'h2', osceanna: 'h2', oceanna: 'h2', h3: 'h3', idalia: 'h3', h4: 'h4', levios: 'h4', h5: 'h5', kairos: 'h5', h6: 'h6', perseus: 'h6' };

function blankState() { return { scores: { ...DEFAULT_SCORES }, history: [] }; }
function writeState(next) { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(STATE_FILE, `${JSON.stringify(next, null, 2)}\n`, 'utf8'); }
function readState() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STATE_FILE)) writeState(blankState());
  try {
    const parsed = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    return { scores: { ...DEFAULT_SCORES, ...(parsed.scores || {}) }, history: Array.isArray(parsed.history) ? parsed.history : [] };
  } catch (err) {
    console.error('[DATA] Recreating invalid scores.json:', err.message);
    const state = blankState(); writeState(state); return state;
  }
}
function normalizeUser(username) { return String(username || '').trim().replace(/^@/, '').toLowerCase(); }
function normalizeTeam(team) { return TEAM_ALIASES[String(team || '').trim().toLowerCase()] || null; }
function requireUser(req, res) {
  const user = normalizeUser(req.body.username);
  if (!user) { res.status(400).json({ ok: false, error: 'Missing username' }); return null; }
  if (!AUTHORIZED_USERS.includes(user)) { res.status(403).json({ ok: false, error: 'Unauthorized username' }); return null; }
  return user;
}
function eventId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
let state = readState();

app.use(express.json({ limit: '20kb' }));
app.use(express.static(__dirname));

function broadcast(message) {
  const payload = JSON.stringify(message);
  for (const client of wss.clients) if (client.readyState === WebSocket.OPEN) client.send(payload);
}
function sendState(type, extra = {}) { broadcast({ type, scores: state.scores, history: state.history, timestamp: new Date().toISOString(), ...extra }); }

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'scores', scores: state.scores, history: state.history, timestamp: new Date().toISOString() }));
});

app.get('/api/scores', (req, res) => res.json({ ok: true, scores: state.scores, history: state.history, timestamp: new Date().toISOString() }));

app.post('/api/score', (req, res) => {
  const username = requireUser(req, res); if (!username) return;
  const team = normalizeTeam(req.body.team);
  if (!team) return res.status(400).json({ ok: false, error: 'Unknown team. Use h1-h6 or a house name.' });
  const delta = Number(req.body.delta);
  if (!Number.isFinite(delta) || delta === 0) return res.status(400).json({ ok: false, error: 'Delta must be a non-zero number.' });
  const before = Number(state.scores[team] || 0);
  const after = before + delta;
  const event = { id: eventId(), type: 'score', username, team, delta, before, after, timestamp: new Date().toISOString() };
  state.scores[team] = after;
  state.history.push(event);
  writeState(state);
  sendState('scoreUpdate', { event, team, delta, newScore: after });
  res.json({ ok: true, team, delta, newScore: after, event, scores: state.scores });
});

app.post('/api/undo', (req, res) => {
  const username = requireUser(req, res); if (!username) return;
  const latest = [...state.history].reverse().find((event) => event.type === 'score' && !event.undoneBy);
  if (!latest) return res.status(400).json({ ok: false, error: 'No score event to undo.' });
  const before = Number(state.scores[latest.team] || 0);
  const after = before - latest.delta;
  const event = { id: eventId(), type: 'undo', username, undoneEventId: latest.id, team: latest.team, delta: -latest.delta, before, after, timestamp: new Date().toISOString() };
  latest.undoneBy = event.id;
  state.scores[latest.team] = after;
  state.history.push(event);
  writeState(state);
  sendState('undo', { event, team: latest.team, delta: event.delta, newScore: after });
  res.json({ ok: true, undone: latest, event, scores: state.scores });
});

app.post('/api/reset', (req, res) => {
  if (String(req.body.key || '') !== ADMIN_KEY) return res.status(403).json({ ok: false, error: 'Unauthorized admin key' });
  const event = { id: eventId(), type: 'reset', username: normalizeUser(req.body.username) || 'admin', before: state.scores, after: { ...DEFAULT_SCORES }, timestamp: new Date().toISOString() };
  state.scores = { ...DEFAULT_SCORES };
  state.history.push(event);
  writeState(state);
  sendState('reset', { event });
  res.json({ ok: true, scores: state.scores, event });
});

app.get('/api/health', (req, res) => res.json({ ok: true, uptime: process.uptime(), connectedClients: wss.clients.size, authorizedUsers: AUTHORIZED_USERS, timestamp: new Date().toISOString() }));
app.use((req, res) => res.status(404).json({ ok: false, error: 'Not found' }));

server.listen(PORT, HOST, () => {
  console.log(`NUSC OWeek live scores running at http://${HOST}:${PORT}`);
  console.log(`WebSocket available at ws://${HOST}:${PORT}`);
  console.log(`Authorized users: ${AUTHORIZED_USERS.join(', ') || '(none)'}`);
});
