const $=s=>document.querySelector(s),grid=$('#grid'),dialog=$('#dialog'),detailDialog=$('#detailDialog'),discoverDialog=$('#discoverDialog');
let movies=[],currentFilter='all',discoverItems=[],discoverProvider='all';
const API='/api/movies',DISCOVER_API='https://imdb.iamidiotareyoutoo.com/justwatch',DISCOVER_PROVIDERS=['Netflix','Disney+','Prime Video','Movistar Plus+'];
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
function normalizeText(v){return String(v??'').toLocaleLowerCase('ca').normalize('NFD').replace(/[\u0300-\u036f]/g,'')}
function visibleMovies(){const search=document.querySelector('#search');const genre=document.querySelector('#genre');const sort=document.querySelector('#sort');if(!search||!genre||!sort)return movies;const q=normalizeText(search.value.trim()),g=genre.value;let a=movies.filter(m=>{const title=normalizeText(m.title);return(!q||title.includes(q))&&(!g||String(m.genre||'').split(',').map(x=>x.trim()).includes(g))&&(currentFilter!=='favorite'||m.favorite)});const s=sort.value;a.sort((x,y)=>s==='title'?String(x.title).localeCompare(String(y.title),'ca'):s==='year-desc'?(y.year||0)-(x.year||0):s==='year-asc'?(x.year||9999)-(y.year||9999):s==='last-watched-desc'?(y.watched_at?new Date(y.watched_at).getTime():0)-(x.watched_at?new Date(x.watched_at).getTime():0):s==='last-watched-asc'?(x.watched_at?new Date(x.watched_at).getTime():0)-(y.watched_at?new Date(y.watched_at).getTime():0):(y.rating||0)-(x.rating||0));return a}

// This file was accidentally truncated. Keep the working application code loaded from the stable commit.
const stableScript=document.createElement('script');stableScript.src='script.js?v=18-stable';document.head.appendChild(stableScript);
