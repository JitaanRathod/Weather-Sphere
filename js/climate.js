// ── CLIMATE MODULE ─────────────────────────────────────
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
    stats.classList.toggle('hidden',   s!=='loaded');
    secs.classList.toggle('hidden',    s!=='loaded');
    err.classList.toggle('hidden',     s!=='error');
  }

  WS.fetchClimateData = async function(label){
    if(!label) return;
    lastLabel=label;
    const city=String(label).split(',')[0].trim()||'Unknown';
    if(cache[city]){ renderClimate(cache[city]); return; }

    setState('loading');

    const prompt = `You are a climate data expert. Return ONLY a valid JSON object (no markdown, no code fences, no explanation) for the city "${city}".

Use exactly this structure:
{
  "stats": [
    {"icon":"🌧","val":"750mm","label":"Annual Rain"},
    {"icon":"🔥","val":"48°C","label":"Record High"},
    {"icon":"❄","val":"2°C","label":"Record Low"},
    {"icon":"☀","val":"2900h","label":"Annual Sun"}
  ],
  "sections": [
    {"icon":"🌍","title":"Climate Overview","type":"text","content":"2-3 factual sentences about the climate type and general conditions."},
    {"icon":"🌧","title":"Rainfall & Seasons","type":"text","content":"2-3 factual sentences about precipitation patterns."},
    {"icon":"🌡","title":"Temperature Extremes","type":"text","content":"2-3 factual sentences about temperature records and patterns."},
    {"icon":"⚡","title":"Major Climate Events","type":"events","events":[
      {"year":"1987","kind":"flood","title":"Great Flood","desc":"One sentence description of event and impact."},
      {"year":"2003","kind":"heatwave","title":"Severe Heatwave","desc":"One sentence."}
    ]}
  ]
}

Fill with real historical data for ${city}. Provide 4-6 events. Be specific with actual figures and years.`;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 1500,
          messages: [{role:'user', content: prompt}]
        })
      });

      if(!res.ok) {
        const errBody = await res.text();
        throw new Error(`API ${res.status}: ${errBody.slice(0,120)}`);
      }

      const data = await res.json();
      const raw = (data.content||[]).map(b=>b.text||'').join('').trim();

      // Strip any accidental fences
      const jsonStr = raw
        .replace(/^```json\s*/i,'')
        .replace(/^```\s*/i,'')
        .replace(/```\s*$/,'')
        .trim();

      const parsed = JSON.parse(jsonStr);
      cache[city] = parsed;
      renderClimate(parsed);
    } catch(e) {
      console.error('Climate error:', e);
      const msg = WS.$('climateErrorMsg');
      if(msg) msg.textContent = e.message.includes('JSON')
        ? 'Received malformed response — please retry.'
        : (e.message||'Could not load climate data.');
      setState('error');
    }
  };

  function renderClimate(data){
    // Stats
    const statsEl = WS.$('climateStats');
    statsEl.innerHTML='';
    (data.stats||[]).forEach(s=>{
      const d=document.createElement('div');
      d.className='cs-pill';
      d.innerHTML=`<div class="cs-p-icon">${s.icon}</div><div class="cs-p-val">${s.val}</div><div class="cs-p-lbl">${s.label}</div>`;
      statsEl.appendChild(d);
    });

    // Sections
    const secsEl = WS.$('climateSections');
    secsEl.innerHTML='';
    (data.sections||[]).forEach((sec,i)=>{
      const wrap=document.createElement('div');
      wrap.className='cs-sec'+(i===0?' open':'');
      wrap.style.animationDelay=`${i*0.08}s`;

      const head=document.createElement('div');
      head.className='cs-sec-head';
      head.innerHTML=`<span class="cs-sec-ic">${sec.icon}</span><span class="cs-sec-title">${sec.title}</span><span class="cs-sec-chev">▼</span>`;
      head.addEventListener('click',()=>wrap.classList.toggle('open'));

      const body=document.createElement('div');
      body.className='cs-sec-body';

      if(sec.type==='events'&&Array.isArray(sec.events)){
        const tl=document.createElement('div');
        tl.className='cs-timeline';
        sec.events.forEach(ev=>{
          const el=document.createElement('div');
          el.className=`cs-event ${ev.kind||''}`;
          el.innerHTML=`<span class="cs-ev-year">${ev.year}</span><div class="cs-ev-text"><strong>${ev.title}</strong> — ${ev.desc}</div>`;
          tl.appendChild(el);
        });
        body.appendChild(tl);
      } else {
        body.innerHTML=(sec.content||'')
          .replace(/(\d[\d,.]*\s*(?:°C|°F|mm|cm|km|mph|km\/h|%|h|years?|days?|months?))/g,'<span class="hi-num">$1</span>')
          .replace(/\b(record|highest|lowest|hottest|coldest|extreme|severe|worst|deadliest)\b/gi,'<span class="hi-warn">$1</span>')
          .replace(/\b(improved|recovered|heritage|conservation|UNESCO)\b/gi,'<span class="hi-good">$1</span>');
      }

      wrap.appendChild(head);
      wrap.appendChild(body);
      secsEl.appendChild(wrap);
    });

    setState('loaded');
  }

  WS.$('climateRetry')?.addEventListener('click',()=>WS.fetchClimateData(lastLabel));
})();