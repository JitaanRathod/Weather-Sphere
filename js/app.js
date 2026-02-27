// ── APP BOOTSTRAP ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const {$, showError, showLoad, applyTheme, setUnit, getUnit, getRecents, fetchByCoords, geocodeCity, geocodeSuggest, mapInit} = WS;

  // ── STATE ──
  let theme = localStorage.getItem('theme') || 'dark';
  let unit  = localStorage.getItem('unit')  || 'C';
  WS.setUnit(unit);
  applyTheme(theme, true);
  mapInit(theme);

  const unitToggle = $('unitToggle');
  if(unitToggle) unitToggle.textContent = unit==='C'?'°C':'°F';

  // ── SPLASH SCREEN ─────────────────────────────────────
  (function initSplash(){
    const splash = $('splash');
    if(!splash) return;

    // Splash canvas particles
    const sc = document.getElementById('splashCanvas');
    if(sc){
      const ctx=sc.getContext('2d');
      let W,H;
      const pts=[];
      function resize(){ W=sc.width=window.innerWidth; H=sc.height=window.innerHeight; }
      resize(); window.addEventListener('resize',resize);
      for(let i=0;i<60;i++) pts.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.8+.3,dx:(Math.random()-.5)*.2,dy:(Math.random()-.5)*.15,a:Math.random()*.6+.1});
      function drawSplash(){
        if(!splash||splash.classList.contains('gone')){return;}
        ctx.clearRect(0,0,W,H);
        pts.forEach(n=>{
          n.x+=n.dx; n.y+=n.dy;
          if(n.x<0)n.x=W; if(n.x>W)n.x=0;
          if(n.y<0)n.y=H; if(n.y>H)n.y=0;
          ctx.beginPath(); ctx.arc(n.x,n.y,n.r,0,Math.PI*2);
          ctx.fillStyle=`rgba(56,189,248,${n.a*.5})`; ctx.fill();
        });
        for(let i=0;i<pts.length;i++){
          for(let j=i+1;j<pts.length;j++){
            const dx=pts[i].x-pts[j].x, dy=pts[i].y-pts[j].y;
            const d=Math.sqrt(dx*dx+dy*dy);
            if(d<130){ ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y);
              ctx.strokeStyle=`rgba(56,189,248,${(1-d/130)*.12})`; ctx.lineWidth=.6; ctx.stroke(); }
          }
        }
        requestAnimationFrame(drawSplash);
      }
      drawSplash();
    }

    // Dismiss splash on scroll
    function dismissSplash(){
      splash.classList.add('exiting');
      setTimeout(()=>{
        splash.classList.add('gone');
        initScrollReveal();
      }, 850);
      window.removeEventListener('scroll', dismissSplash);
      window.removeEventListener('wheel',  dismissSplash);
      window.removeEventListener('touchmove', dismissSplash);
    }

    window.addEventListener('scroll',    dismissSplash, {passive:true});
    window.addEventListener('wheel',     dismissSplash, {passive:true});
    window.addEventListener('touchmove', dismissSplash, {passive:true});
    // Also dismiss after 6s if user doesn't scroll
    setTimeout(dismissSplash, 6000);
  })();

  // ── SCROLL REVEAL ─────────────────────────────────────
  function initScrollReveal(){
    const items = document.querySelectorAll('.reveal-item');
    if(!items.length) return;

    const observer = new IntersectionObserver((entries)=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          const delay = +(entry.target.dataset.delay||0) * 80;
          setTimeout(()=> entry.target.classList.add('revealed'), delay);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    items.forEach(item=> observer.observe(item));
  }

  // ── CANVAS PARTICLES ──────────────────────────────────
  (function initCanvas(){
    const canvas = $('bgCanvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    let W,H;
    const nodes=[];
    let mx=-9999, my=-9999;

    function resize(){ W=canvas.width=window.innerWidth; H=canvas.height=window.innerHeight; }
    resize(); window.addEventListener('resize', resize);
    window.addEventListener('mousemove', e=>{ mx=e.clientX; my=e.clientY; });

    for(let i=0;i<55;i++) nodes.push({
      x:Math.random()*1600, y:Math.random()*900,
      r:Math.random()*1.5+0.3,
      dx:(Math.random()-.5)*.18, dy:(Math.random()-.5)*.12,
      a:Math.random()*.5+.1
    });

    function draw(){
      ctx.clearRect(0,0,W,H);
      const dark=document.documentElement.getAttribute('data-theme')!=='light';

      nodes.forEach(n=>{
        // Mouse repel
        const ddx=n.x-mx, ddy=n.y-my;
        const md=Math.sqrt(ddx*ddx+ddy*ddy);
        if(md<90){ const f=(90-md)/90*.6; n.x+=ddx/md*f; n.y+=ddy/md*f; }

        n.x+=n.dx; n.y+=n.dy;
        if(n.x<0)n.x=W; if(n.x>W)n.x=0;
        if(n.y<0)n.y=H; if(n.y>H)n.y=0;

        ctx.beginPath();
        ctx.arc(n.x,n.y,n.r,0,Math.PI*2);
        ctx.fillStyle=dark?`rgba(56,189,248,${n.a*.5})`:`rgba(14,116,144,${n.a*.2})`;
        ctx.fill();
      });

      // Connections
      for(let i=0;i<nodes.length;i++){
        for(let j=i+1;j<nodes.length;j++){
          const dx=nodes[i].x-nodes[j].x, dy=nodes[i].y-nodes[j].y;
          const dist=Math.sqrt(dx*dx+dy*dy);
          if(dist<110){
            ctx.beginPath();
            ctx.moveTo(nodes[i].x,nodes[i].y);
            ctx.lineTo(nodes[j].x,nodes[j].y);
            const a=(1-dist/110)*.1*(dark?1:.35);
            ctx.strokeStyle=`rgba(56,189,248,${a})`;
            ctx.lineWidth=.6; ctx.stroke();
          }
        }
      }
      requestAnimationFrame(draw);
    }
    draw();
  })();

  // ── THEME TOGGLE ──
  $('themeToggle')?.addEventListener('click', ()=>{
    theme=theme==='dark'?'light':'dark';
    localStorage.setItem('theme',theme);
    applyTheme(theme);
  });

  // ── UNIT TOGGLE ──
  $('unitToggle')?.addEventListener('click', ()=>{
    unit=unit==='C'?'F':'C';
    WS.setUnit(unit);
    localStorage.setItem('unit',unit);
    if(unitToggle) unitToggle.textContent=unit==='C'?'°C':'°F';
    // Re-render with stored data
    const store=WS.getStore?.();
    if(store) WS.renderWeather(store.data, store.label, {fromCache:true});
  });

  // ── SEARCH ──
  const searchInput = $('searchInput');
  const searchBtn   = $('searchBtn');
  const suggestEl   = $('suggestions');
  let suggestTimer  = null;

  async function handleSearch(){
    const q=searchInput?.value.trim();
    if(!q) return;
    suggestEl?.classList.add('hidden');
    showLoad(true);
    try {
      const {latitude,longitude,name,country}=await geocodeCity(q);
      const label=country?`${name}, ${country}`:name;
      await WS.fetchWeather(latitude,longitude,label);
      WS.addRecent({lat:latitude,lon:longitude,label});
    } catch(e){ showError(e.message||'City not found'); }
    finally { showLoad(false); }
  }

  searchInput?.addEventListener('keyup', e=>{
    if(e.key==='Enter'){ handleSearch(); return; }
    clearTimeout(suggestTimer);
    suggestTimer=setTimeout(async()=>{
      const q=searchInput.value.trim();
      if(q.length<2){ suggestEl?.classList.add('hidden'); return; }
      const results=await geocodeSuggest(q);
      if(!results.length||!suggestEl){ suggestEl?.classList.add('hidden'); return; }
      suggestEl.innerHTML='';
      results.forEach(r=>{
        const item=document.createElement('div');
        item.className='sug-item';
        item.textContent=`${r.name}${r.admin?', '+r.admin:''}${r.country?' · '+r.country:''}`;
        item.addEventListener('click',()=>{
          searchInput.value=r.name;
          suggestEl.classList.add('hidden');
          const label=r.country?`${r.name}, ${r.country}`:r.name;
          WS.fetchWeather(r.latitude,r.longitude,label).then(()=>{
            WS.addRecent({lat:r.latitude,lon:r.longitude,label});
          });
        });
        suggestEl.appendChild(item);
      });
      suggestEl.classList.remove('hidden');
    }, 280);
  });
  searchBtn?.addEventListener('click', handleSearch);
  document.addEventListener('click', e=>{ if(!e.target.closest('.header-search')) suggestEl?.classList.add('hidden'); });

  // ── LIVE TRACKING (no separate locate button) ──
  let isTracking=false, watchId=null, trackTimer=null;

  function startTracking(){
    if(!navigator.geolocation){ showError('Geolocation not supported'); return; }
    isTracking=true;
    $('trackBtn')?.classList.add('active');
    $('trackBanner')?.classList.remove('hidden');

    navigator.geolocation.getCurrentPosition(
      pos=>fetchByCoords(pos.coords.latitude,pos.coords.longitude,null),
      err=>showError('Location: '+(err.message||err)),
      {enableHighAccuracy:true,timeout:10000}
    );

    let lastFetch=0;
    watchId=navigator.geolocation.watchPosition(
      pos=>{
        const now=Date.now();
        const txt=$('trackText');
        if(txt) txt.textContent=`Live · ${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`;
        if(now-lastFetch>45000){
          lastFetch=now;
          fetchByCoords(pos.coords.latitude,pos.coords.longitude,null);
        }
      },
      err=>showError('Tracking: '+(err.message||err)),
      {enableHighAccuracy:true,timeout:15000,maximumAge:30000}
    );

    trackTimer=setInterval(()=>{
      navigator.geolocation.getCurrentPosition(
        pos=>fetchByCoords(pos.coords.latitude,pos.coords.longitude,null),
        ()=>{}, {enableHighAccuracy:false,timeout:8000}
      );
    }, 60000);
  }

  function stopTracking(){
    isTracking=false;
    $('trackBtn')?.classList.remove('active');
    $('trackBanner')?.classList.add('hidden');
    if(watchId!=null){ navigator.geolocation.clearWatch(watchId); watchId=null; }
    if(trackTimer){ clearInterval(trackTimer); trackTimer=null; }
  }

  $('trackBtn')?.addEventListener('click', ()=>isTracking?stopTracking():startTracking());
  $('stopTrack')?.addEventListener('click', ()=>stopTracking());

  // ── SUGGESTIONS CSS ── (injected, belongs logically with search)
  const sst=document.createElement('style');
  sst.textContent=`
    .suggestions {
      position:absolute; top:calc(100% + 8px); left:0; right:0; z-index:300;
      background:rgba(10,15,28,0.97); border:1px solid var(--border);
      border-radius:var(--radius-md); overflow:hidden; backdrop-filter:blur(20px);
      box-shadow:0 16px 40px rgba(0,0,0,0.6);
    }
    [data-theme="light"] .suggestions { background:rgba(240,248,255,0.97); }
    .suggestions.hidden { display:none; }
    .sug-item {
      padding:11px 16px; cursor:pointer; font-size:.9rem; color:var(--t2);
      transition:background .15s, color .15s;
      display:flex; align-items:center; gap:8px;
    }
    .sug-item::before { content:'📍'; font-size:.85rem; }
    .sug-item:hover { background:rgba(56,189,248,.1); color:var(--cyan); }
    .sug-item+.sug-item { border-top:1px solid var(--border); }
  `;
  document.head.appendChild(sst);

  // ── INITIAL LOAD ──
  const recents=getRecents();
  if(recents[0]) fetchByCoords(recents[0].lat, recents[0].lon, recents[0].label);
  else fetchByCoords(23.0225, 72.5714, 'Ahmedabad, India');
});