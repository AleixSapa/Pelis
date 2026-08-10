(() => {
  const KEY='pelitrack-order-v1';
  function orderMap(){try{return JSON.parse(localStorage.getItem(KEY))||{groups:[],standalone:[],members:{}}}catch{return{groups:[],standalone:[],members:{}}}}
  function apply(){
    const grid=document.getElementById('grid'); if(!grid) return;
    const s=orderMap(), rank=new Map(); let n=0;
    for(const id of s.groups||[]){rank.set(String(id),n++);for(const m of s.members?.[id]||[])rank.set(String(m),n++)}
    for(const id of s.standalone||[])rank.set(String(id),n++);
    const cards=[...grid.querySelectorAll('.card[data-open]')];
    cards.sort((a,b)=>(rank.get(String(a.dataset.open))??999999)-(rank.get(String(b.dataset.open))??999999));
    cards.forEach(c=>grid.appendChild(c));
  }
  const start=()=>{const g=document.getElementById('grid');if(!g)return;new MutationObserver(()=>requestAnimationFrame(apply)).observe(g,{childList:true});apply()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  window.addEventListener('pelitrack-order-changed',apply);
})();
