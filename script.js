/* =========================================================================
   CONFIG — edit these
   ========================================================================= */
const TARGET = 1000;            // liveliness meter threshold → triggers animation
const houses = [
    { id: 'h1', name: 'Corvex',    color: 'var(--h1)', hex: '#029145', score: 0 },
    { id: 'h2', name: 'Osceanna', color: 'var(--h2)', hex: '#223b90', score: 0 },
    { id: 'h3', name: 'Idalia',  color: 'var(--h3)', hex: '#652c90', score: 0 },
    { id: 'h4', name: 'Levios',     color: 'var(--h4)', hex: '#fe0000', score: 0 },
    { id: 'h5', name: 'Kairos',   color: 'var(--h5)', hex: '#000000', score: 0 },
    { id: 'h6', name: 'Perseus',  color: 'var(--h6)', hex: '#da6f02', score: 0 },
];

/* =========================================================================
   STATE + RENDER
   ========================================================================= */
let target = TARGET;
let celebrated = false;          // so the animation fires once per crossing
const display = {};              // smoothly animated on-screen numbers
houses.forEach(h => display[h.id] = 0);

const grid = document.getElementById('grid');
const totalValueEl = document.getElementById('totalValue');
const fillEl = document.getElementById('fill');
const meterNowEl = document.getElementById('meterNow');
const meterTargetEl = document.getElementById('meterTarget');
const meterEl = document.getElementById('meter');

// build cards
houses.forEach(h => {
    const el = document.createElement('article');
    el.className = 'card';
    el.id = 'card-' + h.id;
    el.style.setProperty('--c', h.color);
    el.innerHTML = `
    <div class="stripe"></div>
    <div class="card-top">
      <div class="house-name">${h.name}</div>
      <div class="rank" id="rank-${h.id}">—</div>
    </div>
    <div class="score" id="score-${h.id}">0</div>`;
    grid.appendChild(el);
});

function total() { return houses.reduce((s,h) => s + h.score, 0); }

function render() {
    // ranks
    const ranked = [...houses].sort((a,b) => b.score - a.score);
    const place = {};
    ranked.forEach((h,i) => place[h.id] = i + 1);
    const ord = ['1st','2nd','3rd','4th','5th','6th'];
    houses.forEach(h => {
        document.getElementById('rank-' + h.id).textContent = ord[place[h.id]-1];
        const card = document.getElementById('card-' + h.id);
        card.classList.toggle('leader', place[h.id] === 1 && h.score > 0);
    });

    // meter
    const t = total();
    meterTargetEl.textContent = target;
    meterNowEl.textContent = t;
    const pct = Math.max(0, Math.min(100, (t / target) * 100));
    fillEl.style.width = pct + '%';

    // celebrate on crossing the target
    if (t >= target && !celebrated) { celebrate(); celebrated = true; meterEl.classList.add('lit'); }
    if (t < target) { celebrated = false; meterEl.classList.remove('lit'); }
}

/* smooth count-up for the big numbers */
function animateNumbers() {
    let any = false;
    houses.forEach(h => {
        const cur = display[h.id];
        if (cur !== h.score) {
            const diff = h.score - cur;
            const step = Math.sign(diff) * Math.max(1, Math.ceil(Math.abs(diff) / 8));
            display[h.id] = Math.abs(step) >= Math.abs(diff) ? h.score : cur + step;
            document.getElementById('score-' + h.id).textContent = display[h.id];
            any = true;
        }
    });
    const shownTotal = houses.reduce((s,h) => s + display[h.id], 0);
    totalValueEl.textContent = shownTotal;
    if (any) requestAnimationFrame(animateNumbers);
}

/* =========================================================================
   PUBLIC API — call these from the WebSocket handler
   ========================================================================= */
function setScore(id, value) {
    const h = houses.find(x => x.id === id || x.name.toLowerCase() === String(id).toLowerCase());
    if (!h) return;
    h.score = value;
    bump(h.id); render(); requestAnimationFrame(animateNumbers);
}
function addScore(id, delta) {
    const h = houses.find(x => x.id === id || x.name.toLowerCase() === String(id).toLowerCase());
    if (!h) return;
    h.score += delta;
    bump(h.id); render(); requestAnimationFrame(animateNumbers);
}
function bump(id) {
    const card = document.getElementById('card-' + id);
    if (!card) return;
    card.setAttribute('data-bump','1');
    setTimeout(() => card.removeAttribute('data-bump'), 600);
}

/* =========================================================================
   WEBSOCKET — plug your backend in here (commented until the server exists)
   ========================================================================= */
/*
  const ws = new WebSocket('wss://your-server.com');
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    // expecting e.g. { houses: { h1: 120, h2: 80, ... } }  OR  { id:'h1', delta:35 }
    if (msg.houses) { for (const k in msg.houses) setScore(k, msg.houses[k]); }
    else if (msg.id && msg.delta != null) { addScore(msg.id, msg.delta); }
    else if (msg.id && msg.score != null) { setScore(msg.id, msg.score); }
  };
  ws.onclose = () => setTimeout(() => location.reload(), 3000); // simple auto-reconnect
*/

/* =========================================================================
   CELEBRATION (confetti + flash + banner)
   ========================================================================= */
const canvas = document.getElementById('confetti');
const ctx = canvas.getContext('2d');
let pieces = [];
function sizeCanvas(){ canvas.width = innerWidth; canvas.height = innerHeight; }
sizeCanvas(); addEventListener('resize', sizeCanvas);

function celebrate() {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    // banner + flash
    const banner = document.getElementById('banner');
    const flash = document.getElementById('flash');
    banner.classList.add('on'); flash.classList.add('on');
    setTimeout(() => flash.classList.remove('on'), 260);
    setTimeout(() => banner.classList.remove('on'), 2600);
    if (reduce) return;

    const colors = houses.map(h => h.hex).concat(['#ffffff']);
    for (let i = 0; i < 220; i++) {
        pieces.push({
            x: innerWidth/2 + (Math.random()-0.5)*120,
            y: innerHeight*0.45,
            vx: (Math.random()-0.5)*16,
            vy: Math.random()*-15 - 4,
            g: 0.35 + Math.random()*0.15,
            size: 6 + Math.random()*7,
            rot: Math.random()*Math.PI,
            vr: (Math.random()-0.5)*0.3,
            color: colors[(Math.random()*colors.length)|0],
            life: 0
        });
    }
    if (pieces.length) runConfetti();
}
let raf = null;
function runConfetti() {
    if (raf) return;
    const tick = () => {
        ctx.clearRect(0,0,canvas.width,canvas.height);
        pieces.forEach(p => {
            p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life++;
            p.vx *= 0.99;
            ctx.save();
            ctx.translate(p.x, p.y); ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            ctx.globalAlpha = Math.max(0, 1 - p.life/170);
            ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size*0.6);
            ctx.restore();
        });
        pieces = pieces.filter(p => p.y < canvas.height + 40 && p.life < 180);
        if (pieces.length) { raf = requestAnimationFrame(tick); }
        else { ctx.clearRect(0,0,canvas.width,canvas.height); raf = null; }
    };
    raf = requestAnimationFrame(tick);
}

/* =========================================================================
   REFEREE TEST PANEL  (delete this whole block for production if you want)
   ========================================================================= */
const devRows = document.getElementById('devRows');
houses.forEach(h => {
    const row = document.createElement('div');
    row.className = 'dev-row';
    row.innerHTML = `
    <span class="dot" style="background:${h.hex}"></span>
    <span class="nm">${h.name}</span>
    <input type="number" id="in-${h.id}" value="35" />
    <button class="add" data-id="${h.id}">Add</button>`;
    devRows.appendChild(row);
});
devRows.querySelectorAll('button.add').forEach(btn => {
    btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const val = parseInt(document.getElementById('in-' + id).value, 10) || 0;
        addScore(id, val);
    });
});
document.getElementById('resetBtn').addEventListener('click', () => {
    houses.forEach(h => h.score = 0);
    celebrated = false;
    render(); requestAnimationFrame(animateNumbers);
});
document.getElementById('targetBtn').addEventListener('click', () => {
    const v = parseInt(prompt('Set liveliness target:', target), 10);
    if (v > 0) { target = v; render(); }
});
const devPanel = document.getElementById('devPanel');
document.getElementById('devToggle').addEventListener('click', () => devPanel.classList.toggle('open'));
addEventListener('keydown', e => { if (e.key === 'd' || e.key === 'D') devPanel.classList.toggle('open'); });

/* init */
render();