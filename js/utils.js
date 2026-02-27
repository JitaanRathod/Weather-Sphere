window.WS = {};

WS.$ = id => document.getElementById(id);

WS.toF   = c => c * 9/5 + 32;
WS.dTemp = (c, unit) => c == null ? '--°' : `${unit==='F' ? Math.round(WS.toF(c)) : Math.round(c)}°`;
WS.compass = d => d == null ? '--' : ['N','NE','E','SE','S','SW','W','NW'][Math.round(d/45)%8];
WS.fmtTime = iso => iso ? new Date(iso).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) : '--:--';
WS.coordKey = (lat,lon) => `${lat.toFixed(4)},${lon.toFixed(4)}`;

WS.wxInfo = (code, isDay=1) => {
  const d = isDay?'d':'n';
  const m = {
    0:{t:'Clear sky',i:`01${d}`}, 1:{t:'Mainly clear',i:`02${d}`},
    2:{t:'Partly cloudy',i:`03${d}`}, 3:{t:'Overcast',i:`04${d}`},
    45:{t:'Fog',i:'50d'}, 48:{t:'Rime fog',i:'50d'},
    51:{t:'Light drizzle',i:'09d'}, 53:{t:'Drizzle',i:'09d'}, 55:{t:'Dense drizzle',i:'09d'},
    61:{t:'Slight rain',i:'10d'}, 63:{t:'Rain',i:'10d'}, 65:{t:'Heavy rain',i:'09d'},
    71:{t:'Light snow',i:'13d'}, 73:{t:'Snow',i:'13d'}, 75:{t:'Heavy snow',i:'13d'},
    80:{t:'Showers',i:'09d'}, 81:{t:'Showers',i:'10d'}, 82:{t:'Violent showers',i:'11d'},
    95:{t:'Thunderstorm',i:'11d'}, 96:{t:'Storm+hail',i:'11d'}, 99:{t:'Severe storm',i:'11d'},
  };
  return m[code] || {t:'Unknown',i:`01${d}`};
};
WS.iconUrl = code => `https://openweathermap.org/img/wn/${code}@2x.png`;

WS.uvInfo = v => {
  if (v==null) return {l:'--',c:'#5a7a96',p:0};
  const u=+v;
  if(u<=2)  return {l:'Low',      c:'#34d399',p:(u/11)*100};
  if(u<=5)  return {l:'Moderate', c:'#fbbf24',p:(u/11)*100};
  if(u<=7)  return {l:'High',     c:'#f97316',p:(u/11)*100};
  if(u<=10) return {l:'Very High',c:'#ef4444',p:(u/11)*100};
  return {l:'Extreme',c:'#c084fc',p:100};
};

WS.aqiInfo = v => {
  if(v==null) return {l:'--',cls:''};
  const a=+v;
  if(a<=20)  return {l:'Good',cls:'aqi-good'};
  if(a<=40)  return {l:'Fair',cls:'aqi-fair'};
  if(a<=60)  return {l:'Moderate',cls:'aqi-moderate'};
  if(a<=80)  return {l:'Poor',cls:'aqi-poor'};
  if(a<=100) return {l:'Very Poor',cls:'aqi-verypoor'};
  return {l:'Extremely Poor',cls:'aqi-extreme'};
};