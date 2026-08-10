(()=>{
const dialog=document.getElementById('sagaOrganizerDialog'),openBtn=document.getElementById('sagaBtn');if(!dialog||!openBtn)return;
let movies=[],state={groups:[],standalone:[],members:{}};
const KEY='pelitrack-order-v1';
const id=m=>String(m?.id??'');
const parentId=m=>m?.parent_movie_id??m?.parentMovieId??m?.parent_id??m?.series_parent_id??m?.saga_parent_id??null;
const isIndividualSaga=m=>parentId(m)!=null&&id(m)===String(parentId(m));
const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
const api=(url,opt={})=>fetch(url,{headers:{'Content-Type':'application/json',...(opt.headers||{})},...opt}).then(async r=>{if(!r.ok){let x={};try{x=await r.json()}catch{}throw Error(x.error||'No s’ha pogut guardar')}return r.status===204?null:r.json()});
function saveLocal(){localStorage.setItem(KEY,JSON.stringify(state));window.dispatchEvent(new CustomEvent('pelitrack-order-changed'))}
function movie(x){return movies.find(m=>id(m)===String(x))}
function rootOf(m){let cur=m,seen=new Set();while(parentId(cur)!=null&&!seen.has(id(cur))){seen.add(id(cur));const p=movie(parentId(cur));if(!p)break;cur=p}return cur||m}
function build(){
 const rank=new Map(movies.map((m,i)=>[id(m),i]));
 const groupsMap=new Map(),standalone=[];
 for(const m of movies){const p=parentId(m);if(p!=null&&movie(p)){const root=rootOf(m),r=id(root);if(!groupsMap.has(r))groupsMap.set(r,{root,items:[]});groupsMap.get(r).items.push(m)}else standalone.push(m)}
 for(const g of groupsMap.values()){
   if(!g.items.some(m=>id(m)===id(g.root)))g.items.push(g.root);
   g.items.sort((a,b)=>(rank.get(id(a))??999999)-(rank.get(id(b))??999999));
 }
 const groups=[...groupsMap.values()].sort((a,b)=>Math.min(...a.items.map(m=>rank.get(id(m))??999999))-Math.min(...b.items.map(m=>rank.get(id(m))??999999)));
 const groupIds=new Set(groups.map(g=>id(g.root)));
 standalone.sort((a,b)=>(rank.get(id(a))??999999)-(rank.get(id(b))??999999));
 state={groups:groups.map(g=>id(g.root)),standalone:standalone.filter(m=>!groupIds.has(id(rootOf(m)))).map(id),members:Object.fromEntries(groups.map(g=>[id(g.root),g.items.map(id)]))};
 saveLocal();return{groups,ind:standalone.filter(m=>!groupIds.has(id(rootOf(m))))};
}
function flatOrder(){const out=[];for(const r of state.groups)for(const x of state.members[r]||[])if(!out.includes(String(x)))out.push(String(x));for(const x of state.standalone)if(!out.includes(String(x)))out.push(String(x));return out}
async function persistOrder(){const ids=flatOrder();await api('/api/movies/reorder',{method:'POST',body:JSON.stringify({ids})});movies=ids.map(movie).filter(Boolean).map((m,i)=>({...m,sort_order:i}));saveLocal()}
function render(){
 const groups=state.groups.map(r=>{const root=movie(r);return root?{root,items:(state.members[r]||[]).map(movie).filter(Boolean)}:null}).filter(Boolean);
 const ind=state.standalone.map(movie).filter(Boolean);
 document.getElementById('sagaGroups').innerHTML=groups.map(g=>`<div class="saga-box" draggable="true" data-group-id="${esc(id(g.root))}"><div class="saga-box-head"><div><strong>🎬 ${esc(g.root.title)}</strong><span>${g.items.length} pel·lícules${g.items.length===1?' · Saga individual':''}</span></div><span class="drag-handle">☷</span></div><div class="saga-movies" data-parent="${esc(id(g.root))}">${g.items.map((m,i)=>`<div class="saga-movie" draggable="true" data-movie-id="${esc(id(m))}"><span>${i+1}️⃣</span><span>${esc(m.title)}</span><span class="drag-handle">☷</span></div>`).join('')}</div></div>`).join('')||'<p class="organizer-empty">No hi ha sagues.</p>';
 document.getElementById('sagaStandalone').innerHTML=ind.map(m=>`<div class="saga-movie independent-movie" draggable="true" data-movie-id="${esc(id(m))}"><span>🎞️</span><span>${esc(m.title)}</span><span class="drag-handle">☷</span><button type="button" class="secondary make-individual-saga" data-individual-saga="${esc(id(m))}">🎬 Crear saga individual</button></div>`).join('')||'<p class="organizer-empty">No hi ha pel·lícules individuals.</p>';
 document.getElementById('sagaCount').textContent=`${groups.length} sagues · ${ind.length} pel·lícules individuals`;dragSetup();
 document.querySelectorAll('[data-individual-saga]').forEach(b=>b.addEventListener('click',async e=>{e.stopPropagation();const mid=b.dataset.individualSaga;try{await createIndividualSaga(mid)}catch(err){alert(err.message)}}));
}
function move(a,from,to){const x=[...a],v=x.splice(from,1)[0];x.splice(Math.max(0,to),0,v);return x}
async function createIndividualSaga(movieId){const m=movie(movieId);if(!m)return;if(isIndividualSaga(m))return;await api(`/api/movies/${m.id}`,{method:'PATCH',body:JSON.stringify({parent_movie_id:Number(m.id)})});movies=movies.map(x=>id(x)===id(m)?{...x,parent_movie_id:Number(x.id)}:x);build();render();}
async function makeSaga(dragId,targetId){const d=movie(dragId),t=movie(targetId);if(!d||!t||id(d)===id(t))return;const root=rootOf(t),r=id(root);await api(`/api/movies/${d.id}`,{method:'PATCH',body:JSON.stringify({parent_movie_id:Number(root.id)})});movies=movies.map(x=>id(x)===id(d)?{...x,parent_movie_id:Number(root.id)}:x);state.groups=state.groups.filter(x=>x!==id(d));state.standalone=state.standalone.filter(x=>x!==id(d));if(!state.groups.includes(r))state.groups.push(r);state.members[r]=state.members[r]||[r];if(!state.members[r].includes(r))state.members[r].unshift(r);state.members[r]=state.members[r].filter(x=>x!==id(d));const p=state.members[r].indexOf(id(t));state.members[r].splice(p<0?state.members[r].length:p+1,0,id(d));try{await persistOrder();render()}catch(e){alert(e.message)}}
function dragSetup(){
 document.querySelectorAll('.saga-box').forEach(box=>{box.addEventListener('dragstart',e=>{if(e.target.closest('.saga-movie'))return;e.dataTransfer.setData('saga-group',box.dataset.groupId)});box.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('saga-group'))e.preventDefault()});box.addEventListener('drop',async e=>{const g=e.dataTransfer.getData('saga-group');if(!g)return;e.preventDefault();const a=state.groups,f=a.indexOf(g),t=a.indexOf(box.dataset.groupId);if(f>=0&&t>=0&&f!==t){state.groups=move(a,f,t);try{await persistOrder();render()}catch(err){alert(err.message)}}})});
 document.querySelectorAll('.saga-movies').forEach(list=>{list.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('movie-id'))e.preventDefault()});list.addEventListener('drop',async e=>{const mid=e.dataTransfer.getData('movie-id');if(!mid)return;e.preventDefault();const parent=list.dataset.parent,target=e.target.closest('.saga-movie');if(target){const order=state.members[parent]||[],f=order.indexOf(mid),t=order.indexOf(target.dataset.movieId);if(f>=0&&t>=0&&f!==t){state.members[parent]=move(order,f,t);try{await persistOrder();render()}catch(err){alert(err.message)}return}}try{await makeSaga(mid,parent)}catch(err){alert(err.message)}})});
 document.querySelectorAll('.saga-movie').forEach(m=>{m.addEventListener('dragstart',e=>{e.stopPropagation();e.dataTransfer.setData('movie-id',m.dataset.movieId)});m.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('movie-id'))e.preventDefault()});m.addEventListener('drop',async e=>{e.preventDefault();e.stopPropagation();const mid=e.dataTransfer.getData('movie-id');if(mid&&mid!==m.dataset.movieId){const d=movie(mid),t=movie(m.dataset.movieId);if(rootOf(d)?.id===rootOf(t)?.id){const r=id(rootOf(t)),o=state.members[r]||[],f=o.indexOf(mid),to=o.indexOf(m.dataset.movieId);if(f>=0&&to>=0){state.members[r]=move(o,f,to);try{await persistOrder();render()}catch(err){alert(err.message)}return}}try{await makeSaga(mid,m.dataset.movieId)}catch(err){alert(err.message)}}})});
 document.querySelectorAll('.independent-movie').forEach(m=>{m.addEventListener('dragstart',e=>{e.stopPropagation();e.dataTransfer.setData('movie-id',m.dataset.movieId)});m.addEventListener('dragover',e=>e.preventDefault());m.addEventListener('drop',async e=>{e.preventDefault();e.stopPropagation();const mid=e.dataTransfer.getData('movie-id');if(mid&&mid!==m.dataset.movieId)try{await makeSaga(mid,m.dataset.movieId)}catch(err){alert(err.message)}})})
}
async function openOrganizer(){try{movies=await api('/api/movies?'+Date.now());if(!Array.isArray(movies))movies=movies?.movies||movies?.data||movies?.results||[];build();render();dialog.showModal()}catch(err){alert('No s’han pogut carregar les pel·lícules.')}}
openBtn.addEventListener('click',openOrganizer);document.getElementById('closeSagaOrganizer')?.addEventListener('click',()=>dialog.close());document.getElementById('closeSagaOrganizer2')?.addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
})();