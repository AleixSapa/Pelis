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

app.get('/api/disney-poster', async (req, res) => {
  try {
    const url = String(req.query.url || ''), parsed = new URL(url);
    if (!/(^|\.)disneyplus\.com$/i.test(parsed.hostname)) return res.status(400).end();
    const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }), html = await r.text();
    const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (!match) return res.status(404).end();
    res.redirect(match[1].replace(/&amp;/g, '&'));
  } catch { res.status(404).end(); }
});

app.get('/api/health', (req, res) => res.json({ ok: true, database: 'sqlite' }));
app.use(express.static(__dirname));
app.use((req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.listen(PORT, '0.0.0.0', () => console.log(`PeliTrack escoltant al port ${PORT}`));
