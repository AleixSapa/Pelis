(() => {
  const API='https://v3.sg.media-imdb.com/suggestion/x/';
  const cache=new Map();
  const norm=s=>String(s||'').toLocaleLowerCase('ca').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  async function findPoster(title){
    const key=norm(title); if(cache.has(key))return cache.get(key);
    const p=(async()=>{try{const r=await fetch(`${API}${encodeURIComponent(title)}.json`,{headers:{Accept:'application/json'}});if(!r.ok)return null;const d=await r.json();const a=(d.d||[]).filter(x=>x?.l&&x?.i?.imageUrl);const exact=a.find(x=>norm(x.l)===key);return (exact||a[0])?.i?.imageUrl||null}catch{return null}})();
    cache.set(key,p);return p;
  }
  async function fix(root=document){
    const nodes=root.querySelectorAll?.('.card, .detail-modal, .random-panel, .discover-card')||[];
    for(const n of nodes){
      if(n.dataset.posterFix==='1')continue;
      const title=n.querySelector('h3')?.textContent?.trim()||n.querySelector('#detailTitle')?.textContent?.trim()||document.querySelector('#detailTitle')?.textContent?.trim();
      if(!title)continue;
      const box=n.querySelector('.poster, .detail-poster, .discover-poster');
      if(!box)continue;
      n.dataset.posterFix='1';
      if(box.querySelector('img'))continue;
      const url=await findPoster(title);
      if(url)box.innerHTML=`<img src="${url.replace(/&/g,'&amp;').replace(/\"/g,'&quot;')}" alt="Pòster de ${title.replace(/&/g,'&amp;').replace(/\"/g,'&quot;')}" loading="lazy">`;
    }
  }
  const observer=new MutationObserver(m=>m.forEach(x=>x.addedNodes.forEach(n=>{if(n.nodeType===1)fix(n)})));
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('load',()=>fix());
  setTimeout(()=>fix(),500);
})();
