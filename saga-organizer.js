(()=>{
const KEY='pelitrack-order-v1',dialog=document.getElementById('sagaOrganizerDialog'),openBtn=document.getElementById('sagaBtn');if(!dialog||!openBtn)return;
let movies=[],state=loadState();
function loadState(){try{return JSON.parse(localStorage.getItem(KEY))||{groups:[],standalone:[],members:{}}}catch{return{groups:[],standalone:[],members:{}}}}
function saveState(){localStorage.setItem(KEY,JSON.stringify(state));window.dispatchEvent(new CustomEvent('pelitrack-order-changed'))}
const id=m=>String(m.id),esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
function baseTitle(title){return String(title||'').toLocaleLowerCase('ca').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+(?:part\.?\s*)?\d+\s*(?::|-|–|—).*$/i,'').replace(/\s+(?:part\.?\s*)?\d+\s*$/i,'').replace(/\s*[:\-–—].*$/,'').trim()}
function sequelNumber(m){const t=String(m.title||''),matches=[...t.matchAll(/(?:^|\s)(\d+)(?=\s|:|-|–|—|$)/g)];return matches.length?Number(matches[matches.length-1][1]):1}
function detectGroups(){
 const map=new Map();movies.forEach(m=>{const b=baseTitle(m.title);if(!map.has(b))map.set(b,[]);map.get(b).push(m)});
 const groups=[],used=new Set();
 map.forEach(list=>{list.sort((a,b)=>sequelNumber(a)-sequelNumber(b)||Number(a.year||9999)-Number(b.year||9999)||String(a.title).localeCompare(String(b.title),'ca'));if(list.length>1){groups.push({root:list[0],items:list});list.forEach(m=>used.add(id(m)))}});
 const linked=new Map();movies.forEach(m=>{if(m.parent_movie_id){const root=movies.find(x=>id(x)===id(m.parent_movie_id));if(root){const k=id(root);if(!linked.has(k))linked.set(k,[root]);linked.get(k).push(m)}}});
 linked.forEach(list=>{if(list.length<2)return;list.sort((a,b)=>sequelNumber(a)-sequelNumber(b)||Number(a.year||9999)-Number(b.year||9999));let g=groups.find(x=>id(x.root)===id(list[0]));if(!g){g={root:list[0],items:list};groups.push(g)}else{const have=new Set(g.items.map(id));list.forEach(m=>{if(!have.has(id(m)))g.items.push(m)})}list.forEach(m=>used.add(id(m)))});
 return{groups,standalone:movies.filter(m=>!used.has(id(m)))}
}
function normalizeState(){
 const {groups,standalone}=detectGroups(),vg=groups.map(g=>id(g.root)),vs=standalone.map(id);
 state.groups=state.groups.filter(x=>vg.includes(String(x)));vg.forEach(x=>{if(!state.groups.includes(x))state.groups.push(x)});
 state.standalone=state.standalone.filter(x=>vs.includes(String(x)));vs.forEach(x=>{if(!state.standalone.includes(x))state.standalone.push(x)});
 groups.forEach(g=>{const k=id(g.root),valid=g.items.map(id),old=Array.isArray(state.members[k])?state.members[k]:[];state.members[k]=old.filter(x=>valid.includes(String(x)));valid.forEach(x=>{if(!state.members[k].includes(x))state.members[k].push(x)})});
 localStorage.setItem(KEY,JSON.stringify(state));return{groups,standalone}
}
function ordered(items,order){const rank=new Map((order||[]).map((x,i)=>[String(x),i]));return[...items].sort((a,b)=>(rank.get(id(a))??999999)-(rank.get(id(b))??999999))}
function render(){
 const {groups,standalone}=normalizeState(),rootList=ordered(groups,state.groups),independent=ordered(standalone,state.standalone);
 const groupHtml=rootList.map(g=>{const root=g.root,kids=ordered(g.items,state.members[id(root)]);return `<div class="saga-box" draggable="true" data-group-id="${esc(id(root))}"><div class="saga-box-head"><div><strong>🎬 ${esc(root.title)}</strong><span>${kids.length} pel·lícules</span></div><span class="drag-handle">☷</span></div><div class="saga-movies" data-parent="${esc(id(root))}">${kids.map((m,i)=>`<div class="saga-movie" draggable="true" data-movie-id="${esc(id(m))}"><span>${i+1}️⃣</span><span>${esc(m.title)}</span><span class="drag-handle">☷</span></div>`).join('')}</div></div>`}).join('');
 document.getElementById('sagaGroups').innerHTML=groupHtml||'<p class="organizer-empty">No s’han detectat sagues.</p>';
 document.getElementById('sagaStandalone').innerHTML=independent.map(m=>`<div class="saga-movie independent-movie" draggable="true" data-movie-id="${esc(id(m))}"><span>🎞️</span><span>${esc(m.title)}</span><span class="drag-handle">☷</span></div>`).join('')||'<p class="organizer-empty">No hi ha pel·lícules independents.</p>';
 document.getElementById('sagaCount').textContent=`${groups.length} sagues · ${standalone.length} independents`;setupDrag()
}
function moveInArray(arr,from,to){const copy=[...arr],[item]=copy.splice(from,1);copy.splice(to,0,item);return copy}
function setupDrag(){
 document.querySelectorAll('.saga-box').forEach(box=>{box.addEventListener('dragstart',e=>{if(e.target.closest('.saga-movie'))return;e.stopPropagation();e.dataTransfer.setData('text/saga-group',box.dataset.groupId)});box.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('text/saga-group'))e.preventDefault()});box.addEventListener('drop',e=>{const gid=e.dataTransfer.getData('text/saga-group');if(!gid||gid===box.dataset.groupId)return;e.preventDefault();e.stopPropagation();const from=state.groups.indexOf(gid),to=state.groups.indexOf(box.dataset.groupId);if(from>=0&&to>=0){state.groups=moveInArray(state.groups,from,to);saveState();render()}})});
 document.querySelectorAll('.saga-movies').forEach(list=>{list.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('text/saga-movie'))e.preventDefault()});list.addEventListener('drop',e=>{const mid=e.dataTransfer.getData('text/saga-movie');if(!mid)return;e.preventDefault();e.stopPropagation();const parent=list.dataset.parent,order=state.members[parent]||[],target=e.target.closest('.saga-movie'),targetId=target?.dataset.movieId,from=order.indexOf(mid),to=targetId?order.indexOf(targetId):order.length-1;if(from>=0&&to>=0&&from!==to){state.members[parent]=moveInArray(order,from,to);saveState();render()}})});
 document.querySelectorAll('.saga-movie[draggable="true"]').forEach(movie=>{movie.addEventListener('dragstart',e=>{e.stopPropagation();e.dataTransfer.setData('text/saga-movie',movie.dataset.movieId)});movie.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('text/saga-movie'))e.preventDefault())})});
 document.querySelectorAll('.independent-movie').forEach(movie=>{movie.addEventListener('dragstart',e=>{e.stopPropagation();e.dataTransfer.setData('text/independent',movie.dataset.movieId)});movie.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('text/independent'))e.preventDefault()});movie.addEventListener('drop',e=>{const mid=e.dataTransfer.getData('text/independent');if(!mid)return;e.preventDefault();e.stopPropagation();const from=state.standalone.indexOf(mid),to=state.standalone.indexOf(movie.dataset.movieId);if(from>=0&&to>=0&&from!==to){state.standalone=moveInArray(state.standalone,from,to);saveState();render()}})})
}
async function openOrganizer(){try{const r=await fetch('/api/movies',{cache:'no-store'});if(!r.ok)throw Error();movies=await r.json();state=loadState();render();dialog.showModal()}catch{alert('No s’han pogut carregar les pel·lícules.')}}
openBtn.addEventListener('click',openOrganizer);document.getElementById('closeSagaOrganizer')?.addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
})();