// ── MAP MODULE ────────────────────────────────────────
(function(){
  const TILES = {
    dark:  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  };
  let leafMap, mapLayer, mapMarker, busy=false;

  WS.mapInit = function(theme){
    leafMap = L.map('map',{attributionControl:false,zoomAnimation:true,fadeAnimation:true})
      .setView([20.5937,78.9629],4);
    mapLayer = addTiles(theme);

    // Inject pulse keyframe
    const st = document.createElement('style');
    st.textContent = `@keyframes mpulse{0%,100%{box-shadow:0 0 0 4px rgba(56,189,248,.3),0 0 16px rgba(56,189,248,.5)}50%{box-shadow:0 0 0 10px rgba(56,189,248,.1),0 0 28px rgba(56,189,248,.7)}}`;
    document.head.appendChild(st);

    leafMap.on('click', async e => {
      if(busy) return;
      busy = true;
      const {lat, lng} = e.latlng;
      showMapLoader(true);
      placeMarker(lat, lng);
      try {
        await WS.fetchByCoords(lat, lng, null);
      } catch(err) {
        WS.showError(err.message || 'Could not fetch weather');
      } finally {
        busy = false;
        showMapLoader(false);
      }
    });
  };

  function addTiles(t){
    return L.tileLayer(TILES[t]||TILES.dark,{maxZoom:20}).addTo(leafMap);
  }

  WS.mapSwapTiles = function(theme){
    const el = document.getElementById('map');
    if(!el||!leafMap) return;
    el.style.opacity='0.15';
    setTimeout(()=>{
      if(mapLayer) leafMap.removeLayer(mapLayer);
      mapLayer = addTiles(theme);
      el.style.transition='opacity .5s';
      el.style.opacity='1';
    },300);
  };

  WS.mapFlyTo = function(lat,lon,skipFly){
    if(!leafMap) return;
    if(skipFly){
      leafMap.setView([lat,lon],13,{animate:false});
    } else {
      const dist = leafMap.distance(leafMap.getCenter(),[lat,lon]);
      if(dist>2000000) leafMap.setView([lat,lon],10,{animate:false});
      else leafMap.flyTo([lat,lon],10,{duration:1.2,easeLinearity:.3});
    }
    placeMarker(lat,lon);
  };

  function placeMarker(lat,lon){
    const icon = L.divIcon({
      className:'',
      html:`<div style="width:14px;height:14px;background:#38bdf8;border:2.5px solid #fff;border-radius:50%;animation:mpulse 2s ease-in-out infinite"></div>`,
      iconSize:[14,14], iconAnchor:[7,7]
    });
    if(mapMarker) mapMarker.setLatLng([lat,lon]);
    else mapMarker = L.marker([lat,lon],{icon}).addTo(leafMap);
  }

  function showMapLoader(on){
    WS.$('mapLoader')?.classList.toggle('hidden',!on);
  }
})();