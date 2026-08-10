(() => {
  const KEY = 'pelitrack-order-v1';
  const dialog = document.getElementById('sagaOrganizerDialog');
  const openBtn = document.getElementById('sagaBtn');
  if (!dialog || !openBtn) return;

  let movies = [];
  let state = loadState();
  function loadState(){try{return JSON.parse(localStorage.getItem(KEY))||{groups:[],standalone:[],members:{}}}catch{return{groups:[],standalone:[],members:{}}}}
  function saveState(){localStorage.setItem(KEY,JSON.stringify(state));window.dispatchEvent(new CustomEvent('pelitrack-order-changed'))}
  const id=m=>String(m.id),esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[c]));
  function normalizeState(){
    const roots=movies.filter(m=>!m.parent_movie_id),children=new Map();
    movies.forEach(m=>{if(m.parent_movie_id){const k=id(m.parent_movie_id);if(!children.has(k))children.set(k,[]);children.get(k).push(m)}});
    const groups=roots.filter(r=>(children.get(id(r))||[]).length>0),standalone=roots.filter(r=>!(children.get(id(r))||[]).length);
    const vg=groups.map(id),vs=standalone.map(id);
    state.groups=[...state.groups.filter(x=>vg.includes(String(x)))];vg.forEach(x=>{if(!state.groups.includes(x))state.groups.push(x)});
    state.standalone=[...state.standalone.filter(x=>vs.includes(String(x)))];vs.forEach(x=>{if(!state.standalone.includes(x))state.standalone.push(x)});
    for(const root of groups){const k=id(root),valid=(children.get(k)||[]).map(id),old=Array.isArray(state.members[k])?state.members[k]:[];state.members[k]=[...old.filter(x=>valid.includes(String(x)))];valid.forEach(x=>{if(!state.members[k].includes(x))state.members[k].push(x)})}
    localStorage.setItem(KEY,JSON.stringify(state));return{groups,standalone,children}
  }
  function ordered(items,order){const rank=new Map((order||[]).map((x,i)=>[String(x),i]));return[...items].sort((a,b)=>(rank.has(id(a))?rank.get(id(a)):999999)-(rank.has(id(b))?rank.get(id(b)):999999))}
  function render(){
    const {groups,standalone,children}=normalizeState(),rootList=ordered(groups,state.groups),independent=ordered(standalone,state.standalone);
    const groupHtml=rootList.map(root=>{const kids=ordered(children.get(id(root))||[],state.members[id(root)]);return `<div class="saga-box" draggable="true" data-group-id="${esc(id(root))}"><div class="saga-box-head"><div><strong>🎬 ${esc(root.title)}</strong><span>${kids.length+1} pel·lícules</span></div><span class="drag-handle">☷</span></div><div class="saga-movies" data-parent="${esc(id(root))}"><div class="saga-movie root-movie" draggable="false" data-movie-id="${esc(id(root))}"><span>1️⃣</span><span>${esc(root.title)}</span></div>${kids.map((m,i)=>`<div class="saga-movie" draggable="true" data-movie-id="${esc(id(m))}"><span>${i+2}️⃣</span><span>${esc(m.title)}</span><span class="drag-handle">☷</span></div>`).join('')}</div></div>`}).join('');
    const independentHtml=independent.map(m=>`<div class="saga-movie independent-movie" draggable="true" data-movie-id="${esc(id(m))}"><span>🎞️</span><span>${esc(m.title)}</span><span class="drag-handle">☷</span></div>`).join('');
    document.getElementById('sagaGroups').innerHTML=groupHtml||'<p class="organizer-empty">Encara no tens cap saga amb més d’una pel·lícula.</p>';
    document.getElementById('sagaStandalone').innerHTML=independentHtml||'<p class="organizer-empty">No hi ha pel·lícules independents.</p>';
    document.getElementById('sagaCount').textContent=`${groups.length} sagues · ${standalone.length} independents`;setupDrag()
  }
  function moveInArray(arr,from,to){const copy=[...arr],[item]=copy.splice(from,1);copy.splice(to,0,item);return copy}
  function setupDrag(){
    document.querySelectorAll('.saga-box').forEach(box=>{
      box.addEventListener('dragstart',e=>{e.stopPropagation();box.classList.add('dragging');e.dataTransfer.setData('text/saga-group',box.dataset.groupId)});
      box.addEventListener('dragend',()=>box.classList.remove('dragging'));
      box.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('text/saga-group')){e.preventDefault();box.classList.add('drag-over')}});
      box.addEventListener('dragleave',()=>box.classList.remove('drag-over'));
      box.addEventListener('drop',e=>{const gid=e.dataTransfer.getData('text/saga-group');if(!gid||gid===box.dataset.groupId)return;e.preventDefault();e.stopPropagation();box.classList.remove('drag-over');const from=state.groups.indexOf(gid),to=state.groups.indexOf(box.dataset.groupId);if(from>=0&&to>=0){state.groups=moveInArray(state.groups,from,to);saveState();render()}})
    });
    document.querySelectorAll('.saga-movies').forEach(list=>{
      list.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('text/saga-movie'))e.preventDefault()});
      list.addEventListener('drop',e=>{const mid=e.dataTransfer.getData('text/saga-movie');if(!mid)return;e.preventDefault();e.stopPropagation();const parent=list.dataset.parent,order=state.members[parent]||[],target=e.target.closest('.saga-movie'),targetId=target?.dataset.movieId,from=order.indexOf(mid),to=targetId?order.indexOf(targetId):order.length-1;if(from>=0&&to>=0&&from!==to){state.members[parent]=moveInArray(order,from,to);saveState();render()}})
    });
    document.querySelectorAll('.saga-movie[draggable="true"]').forEach(movie=>{
      movie.addEventListener('dragstart',e=>{e.stopPropagation();movie.classList.add('dragging');e.dataTransfer.setData('text/saga-movie',movie.dataset.movieId)});
      movie.addEventListener('dragend',()=>movie.classList.remove('dragging'));
      movie.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('text/saga-movie')){e.preventDefault();movie.classList.add('drag-over')}});
      movie.addEventListener('dragleave',()=>movie.classList.remove('drag-over'));
    });
    const independentList=document.getElementById('sagaStandalone');
    independentList.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('text/independent'))e.preventDefault()});
    document.querySelectorAll('.independent-movie').forEach(movie=>{
      movie.addEventListener('dragstart',e=>{e.stopPropagation();movie.classList.add('dragging');e.dataTransfer.setData('text/independent',movie.dataset.movieId)});
      movie.addEventListener('dragend',()=>movie.classList.remove('dragging'));
      movie.addEventListener('dragover',e=>{if(e.dataTransfer.types.includes('text/independent')){e.preventDefault();movie.classList.add('drag-over')}});
      movie.addEventListener('dragleave',()=>movie.classList.remove('drag-over'));
      movie.addEventListener('drop',e=>{const mid=e.dataTransfer.getData('text/independent');if(!mid)return;e.preventDefault();e.stopPropagation();movie.classList.remove('drag-over');const from=state.standalone.indexOf(mid),to=state.standalone.indexOf(movie.dataset.movieId);if(from>=0&&to>=0&&from!==to){state.standalone=moveInArray(state.standalone,from,to);saveState();render()}})
    })
  }
  async function openOrganizer(){try{const r=await fetch('/api/movies',{cache:'no-store'});if(!r.ok)throw Error();movies=await r.json();state=loadState();render();dialog.showModal()}catch{alert('No s’han pogut carregar les pel·lícules.')}}
  openBtn.addEventListener('click',openOrganizer);document.getElementById('closeSagaOrganizer')?.addEventListener('click',()=>dialog.close());dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close()});
})();
