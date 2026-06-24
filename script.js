const TARGET = 1000;
const OLLIE_IMAGE = './assets/ollie.jpg';
const houses = [
  { id: 'h1', name: 'Corvex', color: 'var(--h1)', hex: '#029145', score: 0 },
  { id: 'h2', name: 'Osceanna', color: 'var(--h2)', hex: '#223b90', score: 0 },
  { id: 'h3', name: 'Idalia', color: 'var(--h3)', hex: '#652c90', score: 0 },
  { id: 'h4', name: 'Levios', color: 'var(--h4)', hex: '#fe0000', score: 0 },
  { id: 'h5', name: 'Kairos', color: 'var(--h5)', hex: '#000000', score: 0 },
  { id: 'h6', name: 'Perseus', color: 'var(--h6)', hex: '#da6f02', score: 0 }
];

let target = TARGET;
let celebrated = false;
let clarityMilestone = 0;
const display = {};
houses.forEach((house) => { display[house.id] = 0; });

const grid = document.getElementById('grid');
const totalValueEl = document.getElementById('totalValue');
const fillEl = document.getElementById('fill');
const meterNowEl = document.getElementById('meterNow');
const meterTargetEl = document.getElementById('meterTarget');
const meterEl = document.getElementById('meter');
const statusEl = document.getElementById('connectionStatus');
const adminMessageEl = document.getElementById('adminMessage');
const ollieStageEl = document.getElementById('ollieStage');
const ollieImageEl = document.getElementById('ollieImage');
const olliePercentEl = document.getElementById('olliePercent');

houses.forEach((house) => {
  const el = document.createElement('article');
  el.className = 'card';
  el.id = `card-${house.id}`;
  el.style.setProperty('--c', house.color);
  el.innerHTML = `<div class="stripe"></div><div class="card-top"><div class="house-name">${house.name}</div><div class="rank" id="rank-${house.id}">-</div></div><div class="score" id="score-${house.id}">0</div>`;
  grid.appendChild(el);
});

function total() { return houses.reduce((sum, house) => sum + house.score, 0); }
function render() {
  const ranked = [...houses].sort((a, b) => b.score - a.score);
  const place = {};
  ranked.forEach((house, index) => { place[house.id] = index + 1; });
  const ord = ['1st', '2nd', '3rd', '4th', '5th', '6th'];
  houses.forEach((house) => {
    document.getElementById(`rank-${house.id}`).textContent = ord[place[house.id] - 1];
    document.getElementById(`card-${house.id}`).classList.toggle('leader', place[house.id] === 1 && house.score > 0);
  });
  const currentTotal = total();
  meterTargetEl.textContent = target;
  meterNowEl.textContent = currentTotal;
  const progress = Math.max(0, Math.min(1, currentTotal / target));
  fillEl.style.width = `${progress * 100}%`;
  updateOllieClarity(progress);
  if (currentTotal >= target && !celebrated) { celebrate(); celebrated = true; meterEl.classList.add('lit'); }
  if (currentTotal < target) { celebrated = false; meterEl.classList.remove('lit'); }
}
function animateNumbers() {
  let any = false;
  houses.forEach((house) => {
    const cur = display[house.id];
    if (cur !== house.score) {
      const diff = house.score - cur;
      const step = Math.sign(diff) * Math.max(1, Math.ceil(Math.abs(diff) / 8));
      display[house.id] = Math.abs(step) >= Math.abs(diff) ? house.score : cur + step;
      document.getElementById(`score-${house.id}`).textContent = display[house.id];
      any = true;
    }
  });
  totalValueEl.textContent = houses.reduce((sum, house) => sum + display[house.id], 0);
  if (any) requestAnimationFrame(animateNumbers);
}
function updateOllieClarity(progress) {
  const blur = (1 - progress) * 14;
  const saturation = 0.45 + progress * 0.65;
  const contrast = 0.82 + progress * 0.22;
  const opacity = 0.48 + progress * 0.52;
  ollieStageEl.style.setProperty('--ollie-progress', progress.toFixed(4));
  ollieStageEl.style.setProperty('--ollie-blur', `${blur.toFixed(2)}px`);
  ollieStageEl.style.setProperty('--ollie-saturation', saturation.toFixed(3));
  ollieStageEl.style.setProperty('--ollie-contrast', contrast.toFixed(3));
  ollieStageEl.style.setProperty('--ollie-opacity', opacity.toFixed(3));
  ollieStageEl.style.setProperty('--ollie-glow-opacity', (0.16 + progress * 0.22).toFixed(3));
  olliePercentEl.textContent = `${Math.round(progress * 100)}%`;
  const nextUnlocked = Math.floor(progress * 5);
  if (nextUnlocked > clarityMilestone && progress < 1) {
    document.getElementById('banner').textContent = `OLLIE ${Math.round(progress * 100)}%!`;
    celebrate();
    setTimeout(() => { document.getElementById('banner').textContent = 'MAX HYPE!'; }, 2600);
  }
  clarityMilestone = nextUnlocked;
}
function setScore(id, value) {
  const house = houses.find((item) => item.id === id || item.name.toLowerCase() === String(id).toLowerCase());
  if (!house) return;
  house.score = Number(value) || 0;
  bump(house.id); render(); requestAnimationFrame(animateNumbers);
}
function setScores(scores) { Object.entries(scores || {}).forEach(([id, value]) => setScore(id, value)); }
function bump(id) {
  const card = document.getElementById(`card-${id}`);
  if (!card) return;
  card.setAttribute('data-bump', '1');
  setTimeout(() => card.removeAttribute('data-bump'), 600);
}
function connectSocket() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${location.host}`);
  ws.onopen = () => { statusEl.textContent = 'Live connected'; statusEl.className = 'connection ok'; };
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'scores' || msg.type === 'reset' || msg.type === 'undo') setScores(msg.scores);
    else if (msg.type === 'scoreUpdate') setScore(msg.team, msg.newScore);
  };
  ws.onclose = () => { statusEl.textContent = 'Disconnected - retrying'; statusEl.className = 'connection warn'; setTimeout(connectSocket, 3000); };
  ws.onerror = () => { statusEl.textContent = 'Connection issue'; statusEl.className = 'connection warn'; };
}
async function postJson(url, body) {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || 'Request failed');
  return data;
}
function wireAdminPanel() {
  const panel = document.getElementById('adminPanel');
  const usernameInput = document.getElementById('usernameInput');
  const savedUsername = localStorage.getItem('nusc-admin-username');
  if (savedUsername) usernameInput.value = savedUsername;
  document.getElementById('adminToggle').addEventListener('click', () => panel.classList.toggle('open'));
  document.getElementById('scoreForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = usernameInput.value.trim();
    localStorage.setItem('nusc-admin-username', username);
    try {
      const data = await postJson('/api/score', { username, team: document.getElementById('teamInput').value, delta: Number(document.getElementById('deltaInput').value) });
      adminMessageEl.textContent = `${data.team} is now ${data.newScore}`;
    } catch (err) { adminMessageEl.textContent = err.message; }
  });
  document.getElementById('undoBtn').addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    localStorage.setItem('nusc-admin-username', username);
    try { await postJson('/api/undo', { username }); adminMessageEl.textContent = 'Latest score update undone'; }
    catch (err) { adminMessageEl.textContent = err.message; }
  });
}

function prepareOllieImage() {
  const source = new Image();
  source.src = OLLIE_IMAGE;
  source.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = source.naturalWidth;
    canvas.height = source.naturalHeight;
    const imageContext = canvas.getContext('2d');
    imageContext.drawImage(source, 0, 0);
    const frame = imageContext.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = frame.data;
    for (let i = 0; i < pixels.length; i += 4) {
      const red = pixels[i];
      const green = pixels[i + 1];
      const blue = pixels[i + 2];
      const nearWhite = red > 238 && green > 238 && blue > 238;
      if (nearWhite) {
        pixels[i + 3] = Math.max(0, 255 - (Math.min(red, green, blue) - 238) * 15);
      }
    }
    imageContext.putImageData(frame, 0, 0);
    const transparentOllie = canvas.toDataURL('image/png');
    ollieImageEl.src = transparentOllie;
    ollieStageEl.classList.add('loaded');
  };
  source.onerror = () => {
    ollieImageEl.src = OLLIE_IMAGE;
    ollieStageEl.classList.add('loaded');
  };
}

const canvas = document.getElementById('confetti');
const ctx = canvas.getContext('2d');
let confettiPieces = [];
let raf = null;
function sizeCanvas() { canvas.width = innerWidth; canvas.height = innerHeight; }
sizeCanvas();
addEventListener('resize', sizeCanvas);
function celebrate() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const banner = document.getElementById('banner');
  const flash = document.getElementById('flash');
  banner.classList.add('on'); flash.classList.add('on');
  setTimeout(() => flash.classList.remove('on'), 260);
  setTimeout(() => banner.classList.remove('on'), 2600);
  if (reduce) return;
  const colors = houses.map((house) => house.hex).concat(['#ffffff']);
  for (let i = 0; i < 180; i++) {
    confettiPieces.push({ x: innerWidth / 2 + (Math.random() - 0.5) * 120, y: innerHeight * 0.45, vx: (Math.random() - 0.5) * 16, vy: Math.random() * -15 - 4, g: 0.35 + Math.random() * 0.15, size: 6 + Math.random() * 7, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3, color: colors[(Math.random() * colors.length) | 0], life: 0 });
  }
  if (confettiPieces.length) runConfetti();
}
function runConfetti() {
  if (raf) return;
  const tick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    confettiPieces.forEach((piece) => {
      piece.vy += piece.g; piece.x += piece.vx; piece.y += piece.vy; piece.rot += piece.vr; piece.life += 1; piece.vx *= 0.99;
      ctx.save(); ctx.translate(piece.x, piece.y); ctx.rotate(piece.rot); ctx.fillStyle = piece.color; ctx.globalAlpha = Math.max(0, 1 - piece.life / 170); ctx.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.6); ctx.restore();
    });
    confettiPieces = confettiPieces.filter((piece) => piece.y < canvas.height + 40 && piece.life < 180);
    if (confettiPieces.length) raf = requestAnimationFrame(tick);
    else { ctx.clearRect(0, 0, canvas.width, canvas.height); raf = null; }
  };
  raf = requestAnimationFrame(tick);
}

wireAdminPanel();
prepareOllieImage();
connectSocket();
render();
requestAnimationFrame(animateNumbers);
