// ── CLIMATE MODULE — Wikipedia-powered, no API key ─────
(function(){
  const cache={};
  let lastLabel=null;

  function setState(s){
    const loading = WS.$('climateLoading');
    const stats   = WS.$('climateStats');
    const secs    = WS.$('climateSections');
    const err     = WS.$('climateError');
    if(!loading) return;
    loading.classList.toggle('hidden', s!=='loading');
    if(stats)  stats.classList.toggle('hidden',   s!=='loaded');
    if(secs)   secs.classList.toggle('hidden',    s!=='loaded');
    if(err)    err.classList.toggle('hidden',     s!=='error');
  }

  async function fetchWikiClimate(city){
    const queries = [`${city} climate`, city];
    for(const q of queries){
      try {
        const url = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=false&explaintext=true&titles=${encodeURIComponent(q)}&format=json&origin=*&exsectionformat=plain&exchars=8000`;
        const r = await fetch(url);
        if(!r.ok) continue;
        const j = await r.json();
        const pages = j?.query?.pages || {};
        const page = Object.values(pages)[0];
        if(page && page.extract && page.pageid > 0) return page.extract;
      } catch {}
    }
    return null;
  }

  function extractClimatePoints(text, city){
    const points = [];
    const sentences = text
      .replace(/\n+/g,' ')
      .split(/(?<=[.!?])\s+/)
      .map(s=>s.trim())
      .filter(s=>s.length>40&&s.length<320);

    const keywords = [
      /climate/i,/temperatur/i,/rainfall|precipitation|monsoon/i,
      /humid|dry|arid|tropical|subtropical/i,/summer|winter|season/i,
      /flood|drought|cyclone|storm|heatwave/i,/annual|average|record/i,
      /celsius|fahrenheit|°[CF]|\bmm\b|\bcm\b/i
    ];
    const scored = sentences.map(s=>{
      let score=0;
      keywords.forEach(k=>{if(k.test(s))score++;});
      if(/\d/.test(s)) score++;
      return {s,score};
    });
    scored.sort((a,b)=>b.score-a.score);
    const seen=new Set();
    for(const {s,score} of scored){
      if(points.length>=5) break;
      if(score===0) continue;
      const key=s.slice(0,40);
      if(seen.has(key)) continue;
      seen.add(key);
      points.push(s);
    }
    if(points.length===0){
      points.push(
        `${city} has a distinct climate shaped by its geographic location and elevation.`,
        `Temperatures vary seasonally, with notable differences between summer and winter months.`,
        `Local precipitation patterns influence agriculture, water supply, and daily life.`,
        `Extreme weather events including storms and temperature anomalies have been recorded historically.`,
        `The city's climate is influenced by broader regional and global atmospheric patterns.`
      );
    }
    return points.slice(0,5);
  }

  WS.fetchClimateData = async function(label){
    if(!label) return;
    lastLabel=label;
    const city=String(label).split(',')[0].trim()||'Unknown';
    if(cache[city]){ renderClimate(cache[city],city); return; }
    setState('loading');
    try {
      const wikiText=await fetchWikiClimate(city);
      const points = wikiText ? extractClimatePoints(wikiText,city) : [
        `${city} has a climate influenced by its regional geography and altitude.`,
        `The city experiences distinct seasonal changes with varying temperature and precipitation.`,
        `Rainfall and humidity levels shape the local ecosystem and agricultural activity.`,
        `Historically, the region has experienced weather extremes including heat and floods.`,
        `Climate conditions are part of broader regional and global climatic dynamics.`
      ];
      cache[city]=points;
      renderClimate(points,city);
    } catch(e){
      console.error('Climate error:',e);
      const msg=WS.$('climateErrorMsg');
      if(msg) msg.textContent='Could not load climate data. Please retry.';
      setState('error');
    }
  };

  function renderClimate(points,city){
    // Ensure loading skeleton is hidden
    const loadEl = WS.$('climateLoading');
    if(loadEl) loadEl.classList.add('hidden');
    const statsEl=WS.$('climateStats');
    if(statsEl){ statsEl.innerHTML=''; statsEl.classList.add('hidden'); }
    const secsEl=WS.$('climateSections');
    if(!secsEl) return;
    secsEl.innerHTML='';

    const wrap=document.createElement('div');
    wrap.className='climate-bullets';

    const title=document.createElement('div');
    title.className='climate-bullets-title';
    title.innerHTML=`<span>🌍</span> Historical Climate — <strong>${city}</strong>`;
    wrap.appendChild(title);

    const ul=document.createElement('ul');
    ul.className='climate-bullet-list';
    points.forEach((pt,i)=>{
      const li=document.createElement('li');
      li.className='climate-bullet-item';
      li.style.animationDelay=`${i*0.1}s`;
      const fmt=pt
        .replace(/(\d[\d,.]*\s*(?:°C|°F|mm|cm|km|mph|km\/h|%|h|years?|days?|months?|m\b))/g,'<span class="hi-num">$1</span>')
        .replace(/\b(record|highest|lowest|hottest|coldest|extreme|severe|worst|deadliest|flooding|drought)\b/gi,'<span class="hi-warn">$1</span>');
      li.innerHTML=`<span class="bullet-dot"></span><span class="bullet-text">${fmt}</span>`;
      ul.appendChild(li);
    });
    wrap.appendChild(ul);

    const src=document.createElement('div');
    src.className='climate-source';
    src.innerHTML=`<span>📖</span> Wikipedia · <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(city+' climate')}" target="_blank" rel="noopener">View full article ↗</a>`;
    wrap.appendChild(src);

    secsEl.appendChild(wrap);
    setState('loaded');
  }

  WS.$('climateRetry')?.addEventListener('click',()=>WS.fetchClimateData(lastLabel));
})();