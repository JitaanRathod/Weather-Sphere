// ── UI RENDER MODULE ───────────────────────────────────
(function(){
  const {$,dTemp,compass,fmtTime,wxInfo,iconUrl,uvInfo,aqiInfo} = WS;

  let wxStore=null, unit='C';
  let favs   = JSON.parse(localStorage.getItem('favs')||'[]');
  let recents= JSON.parse(localStorage.getItem('recents')||'[]');

  // ── HELPERS ──────────────────────────────────────────
  WS.showLoad  = on => $('loading')?.classList.toggle('hidden',!on);
  WS.showError = msg => {
    WS.showLoad(false);
    const t=$('errorToast'), m=$('errorMsg');
    if(m) m.textContent=msg;
    if(t) t.classList.remove('hidden');
    clearTimeout(WS.showError._t);
    WS.showError._t=setTimeout(()=>t?.classList.add('hidden'),5000);
  };

  WS.getUnit   = ()=>unit;
  WS.setUnit   = u=>{ unit=u; };
  WS.getStore  = ()=>wxStore;

  // ── THEME ─────────────────────────────────────────────
  WS.applyTheme = function(t, init=false){
    document.documentElement.setAttribute('data-theme',t);
    localStorage.setItem('theme',t);
    const ic=$('themeIcon');
    if(ic) ic.innerHTML = t==='dark'
      ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'
      : '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
    if(!init) WS.mapSwapTiles(t);
  };

  // ── MORPHING LOGO ─────────────────────────────────────
  function morphLogo(code,isDay){
    const sun=$('sunGroup')||null, cloud=$('cloudGroup')||null;
    if(!sun) return;
    const cloudy=code>=2;
    if(isDay&&!cloudy){sun.style.opacity='1';if(cloud)cloud.style.opacity='0';}
    else if(!isDay){sun.style.opacity='0.2';if(cloud)cloud.style.opacity='1';}
    else{sun.style.opacity='0.5';if(cloud)cloud.style.opacity='0.8';}
  }

  // ── AQI ───────────────────────────────────────────────
  WS.renderAQI = function(data){
    const c=data?.current||{};
    const aqi=c.european_aqi??null;
    const info=aqiInfo(aqi);
    s('aqiValue', aqi??'--');
    const al=$('aqiLabel');
    if(al){al.textContent=info.l; al.className='card-badge '+info.cls;}
    s('pm25', c.pm2_5!=null?`${(+c.pm2_5).toFixed(1)} µg`:'--');
    s('pm10', c.pm10!=null?`${(+c.pm10).toFixed(1)} µg`:'--');
  };

  const s=(id,v)=>{ const el=$(id); if(el) el.textContent=v; };

  // ── RENDER WEATHER ─────────────────────────────────────
  WS.renderWeather = function(data, label, opts={}){
    if(!data) return;
    wxStore={data,label};

    const cw=data.current||{};
    const code=cw.weathercode??0;
    const day=cw.is_day??1;
    const wi=wxInfo(code,day);

    // Location
    s('locationName', label||`${data.latitude?.toFixed(2)}°, ${data.longitude?.toFixed(2)}°`);
    s('updatedAt', `Updated ${new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}`);

    // H/L for today
    s('hiLo', `H: ${dTemp(data.daily?.temperature_2m_max?.[0],unit)} · L: ${dTemp(data.daily?.temperature_2m_min?.[0],unit)}`);

    morphLogo(code,day);
    updateFavBtn(label);

    // Icon
    const ic=$('currentIcon');
    if(ic){ ic.src=iconUrl(wi.i); ic.alt=wi.t; }

    // Glow
    const glow=$('iconGlow');
    if(glow){
      if(code===0&&day) glow.style.background='radial-gradient(circle,rgba(251,191,36,.3),transparent 70%)';
      else if(code>=95)  glow.style.background='radial-gradient(circle,rgba(167,139,250,.3),transparent 70%)';
      else if(code>=61)  glow.style.background='radial-gradient(circle,rgba(96,165,250,.3),transparent 70%)';
      else               glow.style.background='radial-gradient(circle,rgba(56,189,248,.2),transparent 70%)';
    }

    // Temp
    s('currentTemp',     dTemp(cw.temperature_2m,unit));
    s('currentCondition', wi.t);

    // Hourly index
    const now=new Date(), hTimes=data.hourly?.time||[];
    let hi=hTimes.findIndex(t=>new Date(t)>now);
    if(hi<1) hi=1; hi--;

    s('feelsLike',  dTemp(data.hourly?.apparent_temperature?.[hi],unit));
    s('humidity',   `${data.hourly?.relative_humidity_2m?.[hi]??'--'}%`);
    s('windSpeed',  `${cw.windspeed_10m??'--'} km/h`);
    s('windDir',    compass(cw.winddirection_10m));
    s('pressure',   `${Math.round(data.hourly?.surface_pressure?.[hi]??0)||'--'} hPa`);
    const visM=data.hourly?.visibility?.[hi];
    s('visibility', visM!=null?`${(visM/1000).toFixed(1)} km`:'--');
    s('sunrise',    fmtTime(data.daily?.sunrise?.[0]));
    s('sunset',     fmtTime(data.daily?.sunset?.[0]));

    // UV
    const uv=data.daily?.uv_index_max?.[0]??null;
    const uvi=uvInfo(uv);
    s('uvValue', uv!=null?(+uv).toFixed(1):'--');
    const uvl=$('uvLabel');
    if(uvl){ uvl.textContent=uvi.l; uvl.style.color=uvi.c; uvl.style.borderColor=uvi.c+'44'; }
    const pct=Math.min(uvi.p,100);
    const fill=$('uvFill'), dot=$('uvDot');
    if(fill) { fill.style.width=`${100-pct}%`; }
    if(dot)  { setTimeout(()=>{ dot.style.left=`${pct}%`; dot.style.background=uvi.c; },60); }

    // Hourly strip
    const strip=$('hourlyStrip');
    if(strip){
      strip.innerHTML='';
      const start=Math.max(0,hTimes.findIndex(t=>new Date(t)>=now));
      hTimes.slice(start,start+24).forEach((t,i)=>{
        const idx=start+i, hour=new Date(t).getHours();
        const w2=wxInfo(data.hourly?.weathercode?.[idx], hour>=6&&hour<19?1:0);
        const el=document.createElement('div');
        el.className='h-cell';
        el.innerHTML=`<div class="h-time">${hour}:00</div><img src="${iconUrl(w2.i)}" alt="${w2.t}" loading="lazy"><div class="h-temp">${dTemp(data.hourly?.temperature_2m?.[idx],unit)}</div>`;
        strip.appendChild(el);
      });
    }

    // 7-day — clickable rows open day detail modal
    const dl=$('dailyList');
    if(dl){
      dl.innerHTML='';
      const maxT=Math.max(...(data.daily?.temperature_2m_max||[0]));
      const minT=Math.min(...(data.daily?.temperature_2m_min||[0]));
      const maxPrecip=Math.max(...(data.daily?.precipitation_sum||[0]),1);
      const span=maxT-minT||1;
      (data.daily?.time||[]).forEach((date,i)=>{
        const dayName=i===0?'Today':new Date(date).toLocaleDateString('en-US',{weekday:'short'});
        const w3=wxInfo(data.daily?.weathercode?.[i]);
        const precip=data.daily?.precipitation_sum?.[i]??0;
        const hi2=data.daily?.temperature_2m_max?.[i]??0;
        const lo2=data.daily?.temperature_2m_min?.[i]??0;
        const barW=Math.max(10,Math.min(100,((hi2-minT)/span)*100));
        const el=document.createElement('div');
        el.className='day-row';
        el.setAttribute('role','button');
        el.setAttribute('tabindex','0');
        el.innerHTML=`
          <span class="day-name">${dayName}</span>
          <img src="${iconUrl(w3.i)}" alt="${w3.t}" loading="lazy">
          <span class="day-precip">${(+precip).toFixed(1)}mm</span>
          <div class="day-bar-wrap"><div class="day-bar" style="width:${barW}%"></div></div>
          <div class="day-temps"><span class="day-hi">${dTemp(hi2,unit)}</span><span class="day-lo">${dTemp(lo2,unit)}</span></div>`;
        // Click → open day modal
        const openDay = () => openDayModal(data, i, unit);
        el.addEventListener('click', openDay);
        el.addEventListener('keyup', e=>{ if(e.key==='Enter'||e.key===' ') openDay(); });
        dl.appendChild(el);
      });
    }

    renderInsights(data,cw,day);
    renderRange(data);
    if(!opts.fromCache) WS.mapFlyTo(data.latitude,data.longitude);
    WS.fetchClimateData(label);
  };

  // ── INSIGHTS ──────────────────────────────────────────
  function renderInsights(data,cw,isDay){
    const el=$('insightsList');
    if(!el) return;
    const now=new Date(), hTimes=data.hourly?.time||[];
    let idx=hTimes.findIndex(t=>new Date(t)>now);
    if(idx<1) idx=1; idx--;

    const temp=cw.temperature_2m, hum=data.hourly?.relative_humidity_2m?.[idx];
    const uv=data.daily?.uv_index_max?.[0], wind=cw.windspeed_10m;
    const code=cw.weathercode??0, vis=data.hourly?.visibility?.[idx];
    const precip7=(data.daily?.precipitation_sum||[]).reduce((a,v)=>a+(v||0),0);
    const maxT=Math.max(...(data.daily?.temperature_2m_max||[0]));
    const minT=Math.min(...(data.daily?.temperature_2m_min||[0]));

    const list=[];
    if(temp>35)    list.push({e:'🔥',t:'Heat Alert',d:`${Math.round(temp)}° — stay hydrated, avoid direct sun.`});
    else if(temp<5)list.push({e:'🥶',t:'Cold Alert',d:`${Math.round(temp)}° — dress in warm layers.`});
    if(uv>5)       list.push({e:'☀️',t:'UV Warning',d:`UV ${(+uv).toFixed(1)} — SPF 30+ recommended.`});
    if(wind>40)    list.push({e:'💨',t:'Strong Winds',d:`${wind} km/h gusts — secure outdoor items.`});
    if(hum>85)     list.push({e:'💦',t:'High Humidity',d:`${hum}% — muggy conditions expected.`});
    else if(hum<25)list.push({e:'🏜️',t:'Dry Air',d:`${hum}% humidity — drink plenty of water.`});
    if(code>=95)   list.push({e:'⛈️',t:'Thunderstorm',d:'Active storm — stay indoors.'});
    if(vis!=null&&vis<1000) list.push({e:'🌫️',t:'Poor Visibility',d:`${(vis/1000).toFixed(1)} km — drive carefully.`});
    if(precip7>15) list.push({e:'🌧️',t:'Rainy Week',d:`${precip7.toFixed(0)}mm rain over 7 days.`});
    else if(precip7===0) list.push({e:'🌤️',t:'Dry Spell',d:'No rain expected this week.'});
    list.push({e:'📊',t:'Weekly Range',d:`${dTemp(minT,unit)} to ${dTemp(maxT,unit)} this week.`});
    list.push({e:isDay?'🌅':'🌙',t:isDay?'Golden Hour':'Night Watch',d:isDay?`☀ ${fmtTime(data.daily?.sunrise?.[0])} · 🌇 ${fmtTime(data.daily?.sunset?.[0])}`:`Sun at ${fmtTime(data.daily?.sunrise?.[0])}`});

    el.innerHTML='';
    list.slice(0,6).forEach((ins,i)=>{
      const div=document.createElement('div');
      div.className='insight';
      div.style.animationDelay=`${i*0.07}s`;
      div.innerHTML=`<div class="ins-emoji">${ins.e}</div><div><div class="ins-title">${ins.t}</div><div class="ins-desc">${ins.d}</div></div>`;
      el.appendChild(div);
    });
  }

  // ── WEEKLY RANGE ──────────────────────────────────────
  function renderRange(data){
    const el=$('rangeList');
    if(!el||!data.daily?.time) return;
    const maxAll=Math.max(...(data.daily.temperature_2m_max||[0]));
    const minAll=Math.min(...(data.daily.temperature_2m_min||[0]));
    const span=maxAll-minAll||1;
    el.innerHTML='';
    data.daily.time.forEach((date,i)=>{
      const day=i===0?'Tod':new Date(date).toLocaleDateString('en-US',{weekday:'short'});
      const hi=data.daily.temperature_2m_max?.[i]??0;
      const lo=data.daily.temperature_2m_min?.[i]??0;
      const pct=Math.max(10,Math.min(100,((hi-minAll)/span)*100));
      const row=document.createElement('div');
      row.className='range-row';
      row.innerHTML=`<span class="range-day">${day}</span><div class="range-track"><div class="range-fill" style="width:0" data-p="${pct}"></div></div><span class="range-hi">${dTemp(hi,unit)}</span><span class="range-lo">${dTemp(lo,unit)}</span>`;
      el.appendChild(row);
    });
    requestAnimationFrame(()=>{
      el.querySelectorAll('.range-fill').forEach(f=>{ f.style.width=f.dataset.p+'%'; });
    });
  }

  // ── FAVOURITES ────────────────────────────────────────
  const saveFavs=()=>localStorage.setItem('favs',JSON.stringify(favs));
  const isFav=lbl=>favs.some(f=>f.label===lbl);

  function updateFavBtn(label){
    const btn=$('favBtn');
    if(!btn||!label) return;
    btn.classList.toggle('starred',isFav(label));
    btn.title=isFav(label)?'Remove favourite':'Add to favourites';
  }
  WS.updateFavBtn=updateFavBtn;

  $('favBtn')?.addEventListener('click',()=>{
    const store=WS.getStore();
    if(!store) return;
    const {label,data}=store;
    if(isFav(label)) favs=favs.filter(f=>f.label!==label);
    else { favs.unshift({label,lat:data.latitude,lon:data.longitude}); if(favs.length>8) favs=favs.slice(0,8); }
    saveFavs(); renderFavs(); updateFavBtn(label);
  });

  function renderFavs(){
    const chips=$('favChips'), sec=$('favSection');
    if(!chips) return;
    chips.innerHTML='';
    if(!favs.length){ sec?.classList.add('hidden'); return; }
    sec?.classList.remove('hidden');
    favs.forEach(f=>{
      const c=document.createElement('button');
      c.className='chip'; c.textContent=f.label.split(',')[0];
      c.onclick=()=>WS.fetchByCoords(f.lat,f.lon,f.label);
      chips.appendChild(c);
    });
  }
  WS.renderFavs=renderFavs;

  // ── RECENTS ───────────────────────────────────────────
  WS.getRecents=()=>recents;
  WS.addRecent=function(loc){
    const i=recents.findIndex(r=>r.label===loc.label);
    if(i>-1) recents.splice(i,1);
    recents.unshift(loc); recents=recents.slice(0,5);
    localStorage.setItem('recents',JSON.stringify(recents));
    renderRecents();
  };

  function renderRecents(){
    const el=$('recentChips');
    if(!el) return;
    el.innerHTML='';
    recents.slice(0,3).forEach(r=>{
      const c=document.createElement('button');
      c.className='chip'; c.textContent=r.label.split(',')[0];
      c.onclick=()=>WS.fetchByCoords(r.lat,r.lon,r.label);
      el.appendChild(c);
    });
  }
  WS.renderRecents=renderRecents;

  // ── DAY DETAIL MODAL ──────────────────────────────────
  function openDayModal(data, idx, unit){
    const modal=$('dayModal'), content=$('dayModalContent');
    if(!modal||!content) return;

    const date       = data.daily?.time?.[idx];
    const code       = data.daily?.weathercode?.[idx]??0;
    const wi         = wxInfo(code, 1);
    const hiT        = data.daily?.temperature_2m_max?.[idx];
    const loT        = data.daily?.temperature_2m_min?.[idx];
    const precip     = data.daily?.precipitation_sum?.[idx]??0;
    const maxPrecip  = Math.max(...(data.daily?.precipitation_sum||[1]),1);
    const uvMax      = data.daily?.uv_index_max?.[idx];
    const sunriseStr = fmtTime(data.daily?.sunrise?.[idx]);
    const sunsetStr  = fmtTime(data.daily?.sunset?.[idx]);

    const isToday    = idx===0;
    const dayFull    = isToday ? 'Today' : new Date(date+'T12:00').toLocaleDateString('en-US',{weekday:'long'});
    const dateFull   = new Date(date+'T12:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});

    // Estimate wind from hourly by finding matching day hours
    const hTimes = data.hourly?.time||[];
    const dayHourIndices = hTimes.reduce((acc,t,i)=>{
      if(t.startsWith(date)) acc.push(i);
      return acc;
    },[]);
    const avgWind = dayHourIndices.length
      ? Math.round(dayHourIndices.reduce((s,i)=>s+(data.hourly?.windspeed_10m?.[i]||0),0)/dayHourIndices.length)
      : '--';
    const avgHum = dayHourIndices.length
      ? Math.round(dayHourIndices.reduce((s,i)=>s+(data.hourly?.relative_humidity_2m?.[i]||0),0)/dayHourIndices.length)
      : '--';
    const precipPct = Math.min(100, (precip/maxPrecip)*100);

    content.innerHTML=`
      <div class="modal-day-name">${dayFull}</div>
      <div class="modal-date">${dateFull}</div>

      <div class="modal-weather-hero">
        <img class="modal-icon" src="${iconUrl(wi.i)}" alt="${wi.t}">
        <div>
          <div class="modal-temp-hi">${dTemp(hiT,unit)}</div>
          <div class="modal-temp-lo">Low ${dTemp(loT,unit)}</div>
          <div class="modal-cond">${wi.t}</div>
        </div>
      </div>

      <div class="modal-stats">
        <div class="modal-stat">
          <div class="modal-stat-icon">💧</div>
          <div class="modal-stat-lbl">Humidity</div>
          <div class="modal-stat-val">${avgHum}%</div>
        </div>
        <div class="modal-stat">
          <div class="modal-stat-icon">💨</div>
          <div class="modal-stat-lbl">Avg Wind</div>
          <div class="modal-stat-val">${avgWind} km/h</div>
        </div>
        <div class="modal-stat">
          <div class="modal-stat-icon">☀️</div>
          <div class="modal-stat-lbl">UV Index</div>
          <div class="modal-stat-val">${uvMax!=null?(+uvMax).toFixed(1):'--'}</div>
        </div>
      </div>

      <div class="modal-sunrise-row">
        <div class="modal-sun-cell">
          <span class="sun-icon">🌅</span>
          <div><div class="sun-lbl">Sunrise</div><div class="sun-val">${sunriseStr}</div></div>
        </div>
        <div class="modal-sun-cell">
          <span class="sun-icon">🌇</span>
          <div><div class="sun-lbl">Sunset</div><div class="sun-val">${sunsetStr}</div></div>
        </div>
      </div>

      <div class="modal-precip-bar">
        <div class="modal-precip-label">🌧 Precipitation</div>
        <div class="modal-precip-val">${(+precip).toFixed(1)} mm</div>
        <div class="modal-precip-track">
          <div class="modal-precip-fill" style="width:0%" data-w="${precipPct}"></div>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    // Animate precip bar
    requestAnimationFrame(()=>{
      const fill=content.querySelector('.modal-precip-fill');
      if(fill) setTimeout(()=>{ fill.style.width=fill.dataset.w+'%'; },80);
    });
  }

  // Close modal on backdrop / close btn
  $('dayModalBackdrop')?.addEventListener('click',()=>$('dayModal')?.classList.add('hidden'));
  $('dayModalClose')?.addEventListener('click',()=>$('dayModal')?.classList.add('hidden'));
  document.addEventListener('keyup',e=>{ if(e.key==='Escape') $('dayModal')?.classList.add('hidden'); });

  // ── INIT ──────────────────────────────────────────────
  renderRecents();
  renderFavs();

  // Clock
  const clockEl=$('clock');
  if(clockEl){
    const tick=()=>{ clockEl.textContent=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}); };
    tick(); setInterval(tick,1000);
  }
})();   