const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'pelitrack.db');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`CREATE TABLE IF NOT EXISTS movies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  year INTEGER,
  genre TEXT,
  poster_url TEXT,
  description TEXT,
  duration_minutes INTEGER,
  rating REAL,
  watched INTEGER NOT NULL DEFAULT 0,
  favorite INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  watched_at TEXT,
  parent_movie_id INTEGER REFERENCES movies(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);`);

app.use(express.json({ limit: '1mb' }));
function cleanMovie(row) { return row ? { ...row, watched: !!row.watched, favorite: !!row.favorite } : null; }
function validateMovie(body, partial = false) {
  const allowed = ['title','year','genre','poster_url','description','duration_minutes','rating','watched','favorite','notes','watched_at','parent_movie_id','updated_at'];
  const out = {};
  for (const key of allowed) if (Object.prototype.hasOwnProperty.call(body, key)) out[key] = body[key];
  if (!partial && (!String(out.title ?? '').trim() || String(out.title).length > 150)) throw new Error('El títol és obligatori i ha de tenir màxim 150 caràcters.');
  if (out.year != null && (!Number.isInteger(Number(out.year)) || Number(out.year) < 1888 || Number(out.year) > 2100)) throw new Error('Any no vàlid.');
  if (out.duration_minutes != null && (!Number.isInteger(Number(out.duration_minutes)) || Number(out.duration_minutes) < 1 || Number(out.duration_minutes) > 1000)) throw new Error('Durada no vàlida.');
  if (out.rating != null && (Number.isNaN(Number(out.rating)) || Number(out.rating) < 0 || Number(out.rating) > 10)) throw new Error('Puntuació no vàlida.');
  if (out.parent_movie_id != null && !Number.isInteger(Number(out.parent_movie_id))) throw new Error('Saga no vàlida.');
  return out;
}

app.get('/api/movies', (req, res) => res.json(db.prepare('SELECT * FROM movies ORDER BY title COLLATE NOCASE').all().map(cleanMovie)));

app.post('/api/movies', (req, res) => {
  try {
    const m = validateMovie(req.body), now = new Date().toISOString();
    const info = db.prepare(`INSERT INTO movies (title,year,genre,poster_url,description,duration_minutes,rating,watched,favorite,notes,watched_at,parent_movie_id,updated_at) VALUES (@title,@year,@genre,@poster_url,@description,@duration_minutes,@rating,0,@favorite,@notes,NULL,@parent_movie_id,@updated_at)`).run({
      title: String(m.title).trim(), year: m.year == null ? null : Number(m.year), genre: m.genre ?? null, poster_url: m.poster_url ?? null, description: m.description ?? null,
      duration_minutes: m.duration_minutes == null ? null : Number(m.duration_minutes), rating: m.rating == null ? null : Number(m.rating), favorite: m.favorite ? 1 : 0,
      notes: m.notes ?? null, parent_movie_id: m.parent_movie_id == null ? null : Number(m.parent_movie_id), updated_at: now
    });
    res.status(201).json(cleanMovie(db.prepare('SELECT * FROM movies WHERE id=?').get(info.lastInsertRowid)));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.patch('/api/movies/:id', (req, res) => {
  try {
    const id = Number(req.params.id); if (!Number.isInteger(id)) return res.status(400).json({ error: 'ID no vàlid.' });
    const m = validateMovie(req.body, true);
    if (m.watched === true) { m.watched = 1; m.watched_at = new Date().toISOString(); }
    if (m.watched === false) { m.watched = 0; m.watched_at = null; }
    if (m.favorite !== undefined) m.favorite = m.favorite ? 1 : 0;
    m.updated_at = new Date().toISOString();
    const keys = Object.keys(m).filter(k => ['title','year','genre','poster_url','description','duration_minutes','rating','watched','favorite','notes','watched_at','parent_movie_id','updated_at'].includes(k));
    if (!keys.length) return res.status(400).json({ error: 'No hi ha dades per actualitzar.' });
    const info = db.prepare(`UPDATE movies SET ${keys.map(k => `${k}=@${k}`).join(', ')} WHERE id=@id`).run({ ...m, id });
    if (!info.changes) return res.status(404).json({ error: 'Pel·lícula no trobada.' });
    res.json(cleanMovie(db.prepare('SELECT * FROM movies WHERE id=?').get(id)));
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.delete('/api/movies/:id', (req, res) => {
  const info = db.prepare('DELETE FROM movies WHERE id=?').run(Number(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'Pel·lícula no trobada.' });
  res.status(204).end();
});

app.get('/api/discover-all', async (req, res) => {
  try {
    const url = 'https://apis.justwatch.com/content/titles/movie/es_ES';
    const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': 'PeliTrack/1.0' } });
    if (!r.ok) throw new Error(`JustWatch HTTP ${r.status}`);
    res.json(await r.json());
  } catch (e) {
    console.error('discover-all:', e);
    res.status(502).json({ error: 'No s’ha pogut carregar el catàleg de streaming.' });
  }
});

app.get('/api/disney-poster', async (req, res) => {
  try {
    const url = String(req.query.url || ''), parsed = new URL(url);
    if (!/(^|\.)disneyplus\.com$/i.test(parsed.hostname)) return res.status(400).end();
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }), html = await r.text();
    const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]+/i);
    if (!match) return res.status(404).end();
    res.redirect(match[1].replace(/&amp;/g, '&'));
  } catch { res.status(404).end(); }
});

const discoverUiScript = `<script>\n(()=>{\nconst B=document.getElementById('discoverBtn'),D=document.getElementById('discoverDialog'),C=document.getElementById('closeDiscover'),R=document.getElementById('discoverResults'),S=document.getElementById('discoverStatus'),I=document.getElementById('discoverSearch'),F=document.getElementById('discoverForm');\nif(!B||!D)return;const ids={Netflix:new Set([8]),'Prime Video':new Set([9]),'Disney+':new Set([337]),'Movistar Plus+':new Set([149,318])};let all=[],filter='all';const esc=v=>String(v??'').replace(/[&<>\\\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\\\"':'&quot;',\"'\":'&#039;'}[c]));const poster=m=>{let p=m.poster||m.poster_url||'';if(p&&!/^https?:/i.test(p))p='https://images.justwatch.com'+p;return p?\`<img src="\${esc(p)}" loading="lazy" onerror="this.style.display='none'">\`:'🎬'};const norm=raw=>(raw.items||raw.results||raw.data||[]).map(x=>{const o=Array.isArray(x.offers)?x.offers:[],pids=new Set(o.map(a=>Number(a.provider_id)).filter(Boolean)),providers=Object.entries(ids).filter(([,s])=>[...s].some(id=>pids.has(id))).map(([n])=>n);return{title:x.title||x.original_title||'Sense títol',year:x.original_release_year||x.year||null,rating:x.imdb_rating||x.rating||null,poster:x.poster||x.poster_url||'',providers};}).filter(x=>x.title);function render(){const q=I.value.trim().toLowerCase(),list=all.filter(x=>(filter==='all'||x.providers.includes(filter))&&(!q||x.title.toLowerCase().includes(q)));S.textContent=list.length?\`\${list.length} pel·lícules\`:'No s’han trobat pel·lícules';R.innerHTML=list.slice(0,100).map((m,i)=>\`<article class="discover-card"><div class="discover-poster">\${poster(m)}</div><div class="discover-info"><h3>\${esc(m.title)}</h3><p>\${m.year||'Any desconegut'}\${m.rating?\` · ⭐ \${Number(m.rating).toFixed(1)}/10\`:''}</p><div class="discover-providers">\${m.providers.length?m.providers.map(p=>\`<span class="discover-provider">\${p}</span>\`).join(''):'<span class="discover-none">Streaming no especificat</span>'}</div><div class="discover-actions"><button class="primary" data-add="\${i}">+ Afegir a PeliTrack</button></div></div></article>\`).join('');}async function load(){S.textContent='Carregant totes les pel·lícules...';R.innerHTML='';try{const r=await fetch('/api/discover-all');if(!r.ok)throw Error();all=norm(await r.json());render()}catch(e){console.error(e);S.textContent='No s’ha pogut carregar el catàleg. Torna-ho a provar.'}}B.onclick=()=>{D.showModal();I.focus();if(!all.length)load();else render()};C.onclick=()=>D.close();F.onsubmit=e=>{e.preventDefault();render()};document.querySelectorAll('.provider-chip').forEach(b=>b.onclick=()=>{document.querySelectorAll('.provider-chip').forEach(x=>x.classList.remove('active'));b.classList.add('active');filter=b.dataset.provider;render()});R.onclick=async e=>{const b=e.target.closest('[data-add]');if(!b)return;const list=all.filter(x=>(filter==='all'||x.providers.includes(filter))&&(!I.value.trim()||x.title.toLowerCase().includes(I.value.trim().toLowerCase()))),m=list[Number(b.dataset.add)];if(!m)return;b.disabled=true;b.textContent='Afegint...';try{const r=await fetch('/api/movies',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:m.title,year:m.year,poster_url:m.poster||null,rating:m.rating?Math.max(0,Math.min(10,Number(m.rating))):null,watched:false,watched_at:null,favorite:false})});if(!r.ok)throw Error();b.textContent='✓ Afegida'}catch(err){b.disabled=false;b.textContent='+ Afegir a PeliTrack';alert('No s’ha pogut afegir la pel·lícula.')}};})();</script>`;
app.get(['/', '/index.html'], (req, res) => {
  const file = path.join(__dirname, 'index.html');
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace('</body>', `${discoverUiScript}</body>`);
  res.setHeader('Cache-Control', 'no-store');
  res.type('html').send(html);
});
app.get('/api/health', (req, res) => res.json({ ok: true, database: 'sqlite' }));
app.use(express.static(__dirname));
app.use((req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, '0.0.0.0', () => console.log(`PeliTrack escoltant al port ${PORT}`));
