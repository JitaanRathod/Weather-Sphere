// ── WEATHER / GEO FETCH ───────────────────────────────
(function(){
  const OPENCAGE_KEY = '974593a4e67747fbb5d3fc16b4557a51';
  const WX_TTL   = 10*60*1000;
  const GEO_TTL  = 24*60*60*1000;
  const AQI_TTL  = 30*60*1000;

  const geoCache={}, wxCache={}, aqiCache={};
  let abort=null;

  // ── GEOCODE CITY ────────────────────────────────────
  WS.geocodeCity = async function(q){
    if(!q) throw new Error('Empty query');
    const key=`gc:${q.toLowerCase()}`;
    const now=Date.now();
    if(geoCache[key]&&now-geoCache[key].ts<GEO_TTL) return geoCache[key].data;
    const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`);
    const j=await r.json();
    if(!j.results?.length) throw new Error(`"${q}" not found`);
    const res=j.results[0];
    const data={latitude:res.latitude,longitude:res.longitude,name:res.name,country:res.country};
    geoCache[key]={ts:now,data};
    return data;
  };

  // ── SUGGEST ─────────────────────────────────────────
  WS.geocodeSuggest = async function(q){
    if(!q||q.length<2) return [];
    try {
      const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`);
      const j=await r.json();
      return (j.results||[]).map(x=>({name:x.name,country:x.country||'',admin:x.admin1||'',latitude:x.latitude,longitude:x.longitude}));
    } catch { return []; }
  };

  // ── REVERSE GEOCODE ──────────────────────────────────
  WS.reverseGeocode = async function(lat,lon){
    const key=`rg:${Math.round(lat*100)},${Math.round(lon*100)}`;
    const now=Date.now();
    if(geoCache[key]&&now-geoCache[key].ts<GEO_TTL) return geoCache[key].data;

    // 1. Try OpenCage
    try {
      const r=await fetch(`https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lon}&key=${OPENCAGE_KEY}&no_annotations=1&language=en&limit=1`);
      if(r.ok){
        const j=await r.json();
        const c=j.results?.[0]?.components||{};
        const name=c.city||c.town||c.village||c.county||c.state_district||c.state||j.results?.[0]?.formatted?.split(',')[0];
        const country=c.country||'';
        if(name){ const data={name,country}; geoCache[key]={ts:now,data}; return data; }
      }
    } catch {}

    // 2. Nominatim fallback (proper reverse geocoder)
    try {
      const r=await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`,
        {headers:{'User-Agent':'WeatherSphere/1.0'}});
      if(r.ok){
        const j=await r.json();
        const a=j.address||{};
        const name=a.city||a.town||a.village||a.suburb||a.county||a.state||j.display_name?.split(',')[0];
        const country=a.country||'';
        if(name){ const data={name,country}; geoCache[key]={ts:now,data}; return data; }
      }
    } catch {}

    return {name:`${lat.toFixed(3)}°, ${lon.toFixed(3)}°`,country:''};
  };

  // ── FETCH WEATHER ────────────────────────────────────
  WS.fetchWeather = async function(lat,lon,label,opts={}){
    const k=WS.coordKey(lat,lon), now=Date.now();
    if(wxCache[k]&&now-wxCache[k].ts<WX_TTL){
      WS.mapFlyTo?.(lat,lon);
      WS.renderWeather(wxCache[k].data, label||wxCache[k].label, {fromCache:true});
      fetchAQI(lat,lon);
      return wxCache[k].data;
    }
    WS.showLoad(true);
    if(abort){try{abort.abort();}catch{} abort=null;}
    abort=new AbortController();
    const h='temperature_2m,apparent_temperature,relative_humidity_2m,weathercode,surface_pressure,windspeed_10m,winddirection_10m,visibility';
    const d='weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max,sunrise,sunset';
    try {
      const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,windspeed_10m,winddirection_10m,is_day&hourly=${h}&daily=${d}&timezone=auto&forecast_days=7`,{signal:abort.signal});
      if(!r.ok) throw new Error('Weather API '+r.status);
      const json=await r.json();
      wxCache[k]={ts:Date.now(),data:json,label};
      WS.mapFlyTo?.(lat,lon);
      WS.renderWeather(json,label,{fromCache:false,...opts});
      fetchAQI(lat,lon);
      return json;
    } catch(e){
      if(e.name==='AbortError') return;
      WS.showError(e.message||'Failed to fetch weather');
      throw e;
    } finally { WS.showLoad(false); abort=null; }
  };

  // ── AQI ──────────────────────────────────────────────
  async function fetchAQI(lat,lon){
    const k=WS.coordKey(lat,lon);
    if(aqiCache[k]&&Date.now()-aqiCache[k].ts<AQI_TTL){ WS.renderAQI(aqiCache[k].data); return; }
    try {
      const r=await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,pm2_5,pm10&timezone=auto`);
      if(!r.ok) return;
      const j=await r.json();
      aqiCache[k]={ts:Date.now(),data:j};
      WS.renderAQI(j);
    } catch {}
  }

  // ── FETCH BY COORDS ──────────────────────────────────
  WS.fetchByCoords = async function(lat,lon,knownLabel=null){
    WS.showLoad(true);
    try {
      let label=knownLabel;
      if(!label){
        const geo=await WS.reverseGeocode(lat,lon);
        label=geo.country?`${geo.name}, ${geo.country}`:geo.name;
      }
      await WS.fetchWeather(lat,lon,label);
      WS.addRecent({lat,lon,label});
    } catch(e){
      if(e.name!=='AbortError') WS.showError(e.message||'Failed to load weather');
    } finally { WS.showLoad(false); }
  };
})();