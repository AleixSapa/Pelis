const SUPABASE_URL = 'https://slyiyotaatewpgoylkbn.supabase.co';
const SUPABASE_KEY = ''; // Introdueix aquí la publishable key o configura-la abans de publicar.

const $ = (s) => document.querySelector(s);
const grid = $('#grid');
const dialog = $('#dialog');
let movies = [];
let currentFilter = 'all';
let localOnly = false;

async function getClient(){
  if(!SUPABASE_KEY){ localOnly = true; return null; }
  if(!window.supabase){
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    window.supabase = { createClient };
  }
  return window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

const db = await getClient();

function escapeHtml(value=''){
  return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}
function poster(url,title){
  if(!url) return '<span>🎬</span>';
  return `<img src="${escapeHtml(url)}" alt="Pòster de ${escapeHtml(title)}" loading="lazy" onerror="this.remove();this.parentElement.innerHTML='<span>🎬</span>'">`;
}
function visibleMovies(){
  const q=$('#search').value.trim().toLowerCase();
  const genre=$('#genre').value;
  let list=movies.filter(m=>{
    const text=`${m.title||''} ${m.genre||''} ${m.description||''}`.toLowerCase();
    if(q&&!text.includes(q)) return false;
    if(genre&&m.genre!==genre) return false;
    if(currentFilter==='pending'&&m.watched) return false;
    if(currentFilter==='watched'&&!m.watched) return false;
    if(currentFilter==='favorite'&&!m.favorite) return false;
    return true;
  });
  const sort=$('#sort').value;
  list.sort((a,b)=>sort==='title'?a.title.localeCompare(b.title,'ca'):sort==='year-desc'?(b.year||0)-(a.year||0):sort==='year-asc'?(a.year||9999)-(b.year||9999):(b.rating||0)-(a.rating||0));
  return list;
}
function render(){
  $('#total').textContent=movies.length;
  $('#watched').textContent=movies.filter(m=>m.watched).length;
  $('#pending').textContent=movies.filter(m=>!m.watched).length;
  const list=visibleMovies();
  grid.innerHTML=list.map(m=>`<article class="card"><div class="poster">${poster(m.poster_url,m.title)}</div><div class="card-body"><h3 title="${escapeHtml(m.title)}">${escapeHtml(m.title)}</h3><div class="meta">${m.year||'—'} · ${escapeHtml(m.genre||'Sense gènere')} · ⭐ ${m.rating??'—'}</div><div class="badges">${m.watched?'<span class="badge">✓ Vista</span>':'<span class="badge">Pendent</span>'}${m.favorite?'<span class="badge">❤️</span>':''}</div><div class="card-actions"><button data-action="toggle" data-id="${m.id}">${m.watched?'Pendent':'Vista'}</button><button data-action="edit" data-id="${m.id}">Editar</button><button data-action="delete" data-id="${m.id}">🗑️</button></div></div></article>`).join('');
  $('#empty').classList.toggle('hidden',list.length>0);
  grid.classList.toggle('hidden',list.length===0);
}
function populateGenres(){
  const current=$('#genre').value;
  const genres=[...new Set(movies.map(m=>m.genre).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ca'));
  $('#genre').innerHTML='<option value="">Tots els gèneres</option>'+genres.map(g=>`<option>${escapeHtml(g)}</option>`).join('');
  $('#genre').value=genres.includes(current)?current:'';
}
function formMovie(m={}){
  $('#modalTitle').textContent=m.id?'Editar pel·lícula':'Afegir pel·lícula';
  $('#id').value=m.id||''; $('#title').value=m.title||''; $('#year').value=m.year||''; $('#genreInput').value=m.genre||''; $('#duration').value=m.duration_minutes||''; $('#rating').value=m.rating??''; $('#poster').value=m.poster_url||''; $('#description').value=m.description||''; $('#notes').value=m.notes||''; $('#isWatched').checked=!!m.watched; $('#isFavorite').checked=!!m.favorite;
  dialog.showModal(); $('#title').focus();
}
function readForm(){return {title:$('#title').value.trim(),year:$('#year').value?Number($('#year').value):null,genre:$('#genreInput').value.trim()||null,duration_minutes:$('#duration').value?Number($('#duration').value):null,rating:$('#rating').value?Number($('#rating').value):null,poster_url:$('#poster').value.trim()||null,description:$('#description').value.trim()||null,notes:$('#notes').value.trim()||null,watched:$('#isWatched').checked,favorite:$('#isFavorite').checked,updated_at:new Date().toISOString()};}

async function load(){
  if(db){const {data,error}=await db.from('movies').select('*').order('title');if(error){console.error(error);alert('No s’han pogut carregar les pel·lícules.');return;}movies=data||[];}
  else {try{movies=JSON.parse(localStorage.getItem('pelis-movies')||'[]')}catch{movies=[]}}
  populateGenres(); render();
}
async function save(){localStorage.setItem('pelis-movies',JSON.stringify(movies));}
async function createMovie(movie){if(db){const {data,error}=await db.from('movies').insert(movie).select().single();if(error)throw error;movies.push(data)}else{movies.push({...movie,id:crypto.randomUUID(),created_at:new Date().toISOString()});await save()}}
async function updateMovie(id,movie){if(db){const {data,error}=await db.from('movies').update(movie).eq('id',id).select().single();if(error)throw error;movies=movies.map(m=>String(m.id)===String(id)?data:m)}else{movies=movies.map(m=>String(m.id)===String(id)?{...m,...movie}:m);await save()}}
async function removeMovie(id){if(db){const {error}=await db.from('movies').delete().eq('id',id);if(error)throw error}movies=movies.filter(m=>String(m.id)!==String(id));if(!db)await save()}

$('#addBtn').onclick=$(()=>formMovie());
$('#emptyAdd').onclick=()=>formMovie();
$('#close').onclick=()=>dialog.close(); $('#cancel').onclick=()=>dialog.close();
$('#form').addEventListener('submit',async e=>{e.preventDefault();const id=$('#id').value;const movie=readForm();if(!movie.title)return;try{id?await updateMovie(id,movie):await createMovie(movie);populateGenres();render();dialog.close()}catch(err){console.error(err);alert('Error en guardar la pel·lícula.')}});
$('#grid').addEventListener('click',async e=>{const b=e.target.closest('button');if(!b)return;const id=b.dataset.id,m=movies.find(x=>String(x.id)===String(id));if(!m)return;try{if(b.dataset.action==='edit')formMovie(m);if(b.dataset.action==='toggle')await updateMovie(id,{watched:!m.watched,updated_at:new Date().toISOString()});if(b.dataset.action==='delete'&&confirm(`Eliminar «${m.title}»?`))await removeMovie(id);populateGenres();render()}catch(err){console.error(err);alert('No s’ha pogut completar l’acció.')}});
document.querySelectorAll('.nav-btn').forEach(b=>b.onclick=()=>{document.querySelectorAll('.nav-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');currentFilter=b.dataset.filter;render()});
$('#search').oninput=render; $('#genre').onchange=render; $('#sort').onchange=render;
load();