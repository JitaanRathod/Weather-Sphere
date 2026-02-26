document.addEventListener('DOMContentLoaded', () => {

    // ── CONFIG ────────────────────────────────────────────────────────────────
    const OPENCAGE_KEY = '974593a4e67747fbb5d3fc16b4557a51'; // ⚠️ proxy before deploy
    const WEATHER_TTL = 10 * 60 * 1000;
    const GEO_TTL = 24 * 60 * 60 * 1000;
    const AQI_TTL = 30 * 60 * 1000;
    const TRACK_INTERVAL_MS = 60 * 1000; // re-fetch location every 60s

    // ── DOM ───────────────────────────────────────────────────────────────────
    const $ = id => document.getElementById(id);
    const searchInput = $('searchInput');
    const searchBtn = $('searchBtn');
    const locateBtn = $('locateBtn');
    const trackBtn = $('trackBtn');
    const stopTrackBtn = $('stopTrack');
    const trackBanner = $('trackBanner');
    const trackText = $('trackText');
    const unitToggle = $('unitToggle');
    const themeToggle = $('themeToggle');
    const themeIcon = $('themeIcon');
    const locationName = $('locationName');
    const updatedAt = $('updatedAt');
    const currentIcon = $('currentIcon');
    const currentTemp = $('currentTemp');
    const currentCond = $('currentCondition');
    const feelsLike = $('feelsLike');
    const humidity = $('humidity');
    const windSpeed = $('windSpeed');
    const windDir = $('windDir');
    const pressure = $('pressure');
    const visibility = $('visibility');
    const sunrise = $('sunrise');
    const sunset = $('sunset');
    const uvValue = $('uvValue');
    const uvLabel = $('uvLabel');
    const uvFill = $('uvFill');
    const aqiValue = $('aqiValue');
    const aqiLabel = $('aqiLabel');
    const pm25 = $('pm25');
    const pm10 = $('pm10');
    const hourlyEl = $('hourlyContainer');
    const dailyEl = $('dailyContainer');
    const loadingVeil = $('loading');
    const recentChips = $('recentChips');
    const favChips = $('favChips');
    const favSection = $('favSection');
    const favBtn = $('favBtn');
    const insightsList = $('insightsList');
    const tempRangeList = $('tempRangeList');
    const errorToast = $('errorToast');
    const errorMsgEl = $('errorMsg');
    const footerClock = $('footerClock');
    const iconGlow = $('iconGlow');

    // ── STATE ─────────────────────────────────────────────────────────────────
    const geoCache = new Map(), wxCache = new Map(), aqiCache = new Map();
    let unit = localStorage.getItem('unit') || 'C';
    let theme = localStorage.getItem('theme') || 'dark';
    let wxData = null;
    let curLabel = null;
    let precipChart = null;
    let mapLayer = null;
    let mapMarker = null;
    let abortCtrl = null;
    let trackWatchId = null;
    let trackTimer = null;
    let isTracking = false;

    // ── BOOT ──────────────────────────────────────────────────────────────────
    applyTheme(theme, true);
    unitToggle.textContent = unit === 'C' ? '°C' : '°F';
    initBgCanvas();
    startClock();

    // ── ANIMATED BACKGROUND ───────────────────────────────────────────────────
    function initBgCanvas() {
        const canvas = $('bgCanvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let W, H;
        const nodes = [];

        function resize() {
            W = canvas.width = window.innerWidth;
            H = canvas.height = window.innerHeight;
        }
        resize();
        window.addEventListener('resize', resize);

        // Fewer, slower nodes — subtle depth
        for (let i = 0; i < 70; i++) {
            nodes.push({
                x: Math.random() * 1600, y: Math.random() * 1000,
                r: Math.random() * 1.8 + 0.2,
                dx: (Math.random() - 0.5) * 0.15,
                dy: (Math.random() - 0.5) * 0.1,
                a: Math.random() * 0.6 + 0.1,
            });
        }

        function drawFrame() {
            ctx.clearRect(0, 0, W, H);
            const dark = document.documentElement.getAttribute('data-theme') !== 'light';

            // Draw nebula blobs
            if (dark) {
                const g1 = ctx.createRadialGradient(W * 0.2, H * 0.3, 0, W * 0.2, H * 0.3, W * 0.4);
                g1.addColorStop(0, 'rgba(59,82,246,0.08)');
                g1.addColorStop(1, 'transparent');
                ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);

                const g2 = ctx.createRadialGradient(W * 0.8, H * 0.7, 0, W * 0.8, H * 0.7, W * 0.35);
                g2.addColorStop(0, 'rgba(99,62,206,0.07)');
                g2.addColorStop(1, 'transparent');
                ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);

                const g3 = ctx.createRadialGradient(W * 0.5, H * 0.1, 0, W * 0.5, H * 0.1, W * 0.25);
                g3.addColorStop(0, 'rgba(6,182,212,0.05)');
                g3.addColorStop(1, 'transparent');
                ctx.fillStyle = g3; ctx.fillRect(0, 0, W, H);
            }

            // Draw nodes + connections
            nodes.forEach(n => {
                n.x += n.dx; n.y += n.dy;
                if (n.x < 0) n.x = W; if (n.x > W) n.x = 0;
                if (n.y < 0) n.y = H; if (n.y > H) n.y = 0;
                ctx.beginPath();
                ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
                ctx.fillStyle = dark
                    ? `rgba(147,197,253,${n.a * 0.7})`
                    : `rgba(37,99,235,${n.a * 0.25})`;
                ctx.fill();
            });

            // Draw connecting lines between close nodes
            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[i].x - nodes[j].x;
                    const dy = nodes[i].y - nodes[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.moveTo(nodes[i].x, nodes[i].y);
                        ctx.lineTo(nodes[j].x, nodes[j].y);
                        const alpha = (1 - dist / 120) * 0.12 * (dark ? 1 : 0.4);
                        ctx.strokeStyle = dark ? `rgba(99,130,246,${alpha})` : `rgba(37,99,235,${alpha})`;
                        ctx.lineWidth = 0.6;
                        ctx.stroke();
                    }
                }
            }
            requestAnimationFrame(drawFrame);
        }
        drawFrame();
    }

    // ── CLOCK ─────────────────────────────────────────────────────────────────
    function startClock() {
        const tick = () => {
            if (footerClock) footerClock.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        };
        tick(); setInterval(tick, 1000);
    }

    // ── POLYMORPHIC LOGO ICON ─────────────────────────────────────────────────
    function morphLogo(code, isDay) {
        const sunGroup = $('sunGroup');
        const cloudGroup = $('cloudGroup');
        if (!sunGroup) return;
        const cloudy = code >= 2;
        const showSun = isDay && !cloudy;
        sunGroup.style.transition = 'opacity 0.7s ease';
        cloudGroup.style.transition = 'opacity 0.7s ease';
        if (showSun) { sunGroup.style.opacity = '1'; cloudGroup.style.opacity = '0'; }
        else if (!isDay) { sunGroup.style.opacity = '0.2'; cloudGroup.style.opacity = '1'; }
        else { sunGroup.style.opacity = '0.5'; cloudGroup.style.opacity = '0.8'; }
    }

    // ── THEME ──────────────────────────────────────────────────────────────────
    function applyTheme(t, init = false) {
        document.documentElement.setAttribute('data-theme', t);
        theme = t; localStorage.setItem('theme', t);
        if (themeIcon) {
            themeIcon.innerHTML = t === 'dark'
                ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'
                : '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
        }
        if (!init) {
            swapMapTiles();
            if (wxData) renderPrecipChart(wxData);
        }
    }
    themeToggle?.addEventListener('click', () => applyTheme(theme === 'dark' ? 'light' : 'dark'));

    // ── UNIT TOGGLE ────────────────────────────────────────────────────────────
    unitToggle?.addEventListener('click', () => {
        unit = unit === 'C' ? 'F' : 'C';
        localStorage.setItem('unit', unit);
        unitToggle.textContent = unit === 'C' ? '°C' : '°F';
        if (wxData) renderWeather(wxData, curLabel, { fromCache: true });
    });

    // ── UTILS ─────────────────────────────────────────────────────────────────
    const showLoad = on => loadingVeil.classList.toggle('hidden', !on);
    const showError = msg => {
        showLoad(false);
        errorMsgEl.textContent = msg;
        errorToast.classList.remove('hidden');
        clearTimeout(showError._t);
        showError._t = setTimeout(() => errorToast.classList.add('hidden'), 5000);
    };
    const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
    const coordKey = (lat, lon) => `${lat.toFixed(4)},${lon.toFixed(4)}`;
    const toF = c => c * 9 / 5 + 32;
    const dTemp = c => c == null ? '--°' : `${unit === 'F' ? Math.round(toF(c)) : Math.round(c)}°`;
    const compass = d => d == null ? '--' : ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(d / 45) % 8];
    const cancelAb = () => { if (abortCtrl) { try { abortCtrl.abort(); } catch (e) { } abortCtrl = null; } };

    function wxInfo(code, isDay = 1) {
        const d = isDay ? 'd' : 'n';
        const m = {
            0: { t: 'Clear sky', i: `01${d}` }, 1: { t: 'Mainly clear', i: `02${d}` }, 2: { t: 'Partly cloudy', i: `03${d}` }, 3: { t: 'Overcast', i: `04${d}` },
            45: { t: 'Fog', i: '50d' }, 48: { t: 'Rime fog', i: '50d' },
            51: { t: 'Light drizzle', i: '09d' }, 53: { t: 'Drizzle', i: '09d' }, 55: { t: 'Dense drizzle', i: '09d' },
            61: { t: 'Slight rain', i: '10d' }, 63: { t: 'Rain', i: '10d' }, 65: { t: 'Heavy rain', i: '09d' },
            71: { t: 'Light snow', i: '13d' }, 73: { t: 'Snow', i: '13d' }, 75: { t: 'Heavy snow', i: '13d' },
            80: { t: 'Showers', i: '09d' }, 81: { t: 'Showers', i: '10d' }, 82: { t: 'Violent showers', i: '11d' },
            95: { t: 'Thunderstorm', i: '11d' }, 96: { t: 'Storm+hail', i: '11d' }, 99: { t: 'Severe storm', i: '11d' },
        };
        return m[code] || { t: 'Unknown', i: `01${d}` };
    }
    const iconUrl = code => `https://openweathermap.org/img/wn/${code}@2x.png`;

    function uvInfo(v) {
        if (v == null) return { l: '--', c: '#5a7a96', p: 0 };
        const u = +v;
        if (u <= 2) return { l: 'Low', c: '#34d399', p: (u / 11) * 100 };
        if (u <= 5) return { l: 'Moderate', c: '#fbbf24', p: (u / 11) * 100 };
        if (u <= 7) return { l: 'High', c: '#f97316', p: (u / 11) * 100 };
        if (u <= 10) return { l: 'Very High', c: '#ef4444', p: (u / 11) * 100 };
        return { l: 'Extreme', c: '#c084fc', p: 100 };
    }
    function aqiInfo(v) {
        if (v == null) return { l: '--', cls: '' };
        const a = +v;
        if (a <= 20) return { l: 'Good', cls: 'aqi-good' };
        if (a <= 40) return { l: 'Fair', cls: 'aqi-fair' };
        if (a <= 60) return { l: 'Moderate', cls: 'aqi-moderate' };
        if (a <= 80) return { l: 'Poor', cls: 'aqi-poor' };
        if (a <= 100) return { l: 'Very Poor', cls: 'aqi-verypoor' };
        return { l: 'Extremely Poor', cls: 'aqi-extreme' };
    }

    // ── MAP ────────────────────────────────────────────────────────────────────
    const TILES = {
        dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    };
    const leafMap = L.map('map', {
        attributionControl: false,
        zoomAnimation: true, fadeAnimation: true, markerZoomAnimation: true,
    }).setView([20.5937, 78.9629], 5);

    function addTiles(t) { return L.tileLayer(TILES[t] || TILES.dark, { maxZoom: 20 }).addTo(leafMap); }
    mapLayer = addTiles(theme);

    function swapMapTiles() {
        const el = document.getElementById('map');
        if (!el) return;
        el.style.opacity = '0.2';
        setTimeout(() => {
            if (mapLayer) leafMap.removeLayer(mapLayer);
            mapLayer = addTiles(theme);
            el.style.transition = 'opacity 0.5s';
            el.style.opacity = '1';
        }, 300);
    }

    function flyTo(lat, lon) {
        const cur = leafMap.getCenter();
        const dist = leafMap.distance(cur, [lat, lon]);
        if (dist > 1800000) leafMap.setView([lat, lon], 11, { animate: false });
        else leafMap.flyTo([lat, lon], 11, { duration: 1.0, easeLinearity: 0.35 });
        if (mapMarker) mapMarker.setLatLng([lat, lon]);
        else mapMarker = L.marker([lat, lon]).addTo(leafMap);
    }

    // ── map click → reverse geocode → show city name ──────────────────────────
    leafMap.on('click', async (e) => {
        const { lat, lng } = e.latlng;
        await fetchByCoords(lat, lng, null, { animateMap: true });
    });

    // ── GEOCODING ─────────────────────────────────────────────────────────────
    async function geocodeCity(q) {
        if (!q) throw new Error('Empty query');
        const key = `gc:${q.toLowerCase()}`;
        const now = Date.now();
        const c = geoCache.get(key);
        if (c && now - c.ts < GEO_TTL) return c.data;
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`;
        abortCtrl = new AbortController();
        const r = await fetch(url, { signal: abortCtrl.signal });
        const j = await r.json();
        if (!j.results?.length) throw new Error(`"${q}" not found`);
        const res = j.results[0];
        const data = { latitude: res.latitude, longitude: res.longitude, name: res.name, country: res.country };
        geoCache.set(key, { ts: now, data });
        return data;
    }

    // FIXED: robust reverse geocoder — always returns a human-readable name
    async function reverseGeocode(lat, lon) {
        const key = `rg:${Math.round(lat * 100)},${Math.round(lon * 100)}`;
        const now = Date.now();
        const c = geoCache.get(key);
        if (c && now - c.ts < GEO_TTL) return c.data;

        try {
            abortCtrl = new AbortController();
            const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lon}&key=${OPENCAGE_KEY}&no_annotations=1&language=en&limit=1`;
            const res = await fetch(url, { signal: abortCtrl.signal });
            const json = await res.json();
            const comp = json.results?.[0]?.components || {};
            const name = comp.city || comp.town || comp.village || comp.county
                || comp.state_district || comp.state
                || json.results?.[0]?.formatted?.split(',')[0]
                || null;
            const country = comp.country || '';
            if (name) {
                const data = { name, country };
                geoCache.set(key, { ts: now, data });
                return data;
            }
        } catch (e) { /* fall through to Open-Meteo fallback */ }

        // Fallback: use Open-Meteo's geocoding reverse-ish (find nearest named place)
        try {
            const url = `https://geocoding-api.open-meteo.com/v1/search?name=&latitude=${lat}&longitude=${lon}&count=1&language=en&format=json`;
            const res = await fetch(url);
            const json = await res.json();
            if (json.results?.length) {
                const r = json.results[0];
                const data = { name: r.name, country: r.country || '' };
                geoCache.set(key, { ts: now, data });
                return data;
            }
        } catch (e) { }

        // Last resort: formatted coords
        return { name: `${lat.toFixed(3)}°, ${lon.toFixed(3)}°`, country: '' };
    }

    // ── WEATHER FETCH ─────────────────────────────────────────────────────────
    async function fetchWeather(lat, lon, label, opts = {}) {
        const k = coordKey(lat, lon);
        const now = Date.now();
        const c = wxCache.get(k);
        if (c && now - c.ts < WEATHER_TTL) {
            renderWeather(c.data, label || c.label, { fromCache: true });
            fetchAQI(lat, lon);
            return c.data;
        }
        showLoad(true);
        cancelAb();
        abortCtrl = new AbortController();
        const hourly = 'temperature_2m,apparent_temperature,relative_humidity_2m,weathercode,surface_pressure,windspeed_10m,winddirection_10m,visibility';
        const daily = 'weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max,sunrise,sunset';
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,windspeed_10m,winddirection_10m,is_day&hourly=${hourly}&daily=${daily}&timezone=auto&forecast_days=7`;
        try {
            const res = await fetch(url, { signal: abortCtrl.signal });
            if (!res.ok) throw new Error('Weather API error ' + res.status);
            const json = await res.json();
            wxCache.set(k, { ts: Date.now(), data: json, label });
            renderWeather(json, label, { fromCache: false, ...opts });
            fetchAQI(lat, lon);
            return json;
        } catch (e) {
            if (e.name === 'AbortError') return;
            showError(e.message || 'Failed to fetch weather');
            throw e;
        } finally {
            showLoad(false);
            abortCtrl = null;
        }
    }

    // ── AQI ───────────────────────────────────────────────────────────────────
    async function fetchAQI(lat, lon) {
        const k = coordKey(lat, lon);
        const c = aqiCache.get(k);
        if (c && Date.now() - c.ts < AQI_TTL) { renderAQI(c.data); return; }
        try {
            const res = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=european_aqi,pm2_5,pm10&timezone=auto`);
            if (!res.ok) return;
            const json = await res.json();
            aqiCache.set(k, { ts: Date.now(), data: json });
            renderAQI(json);
        } catch (e) { }
    }
    function renderAQI(data) {
        const c = data?.current || {};
        const aqi = c.european_aqi ?? null;
        const info = aqiInfo(aqi);
        aqiValue.textContent = aqi ?? '--';
        aqiLabel.textContent = info.l;
        aqiLabel.className = `card-sub-label ${info.cls}`;
        pm25.textContent = c.pm2_5 != null ? `${(+c.pm2_5).toFixed(1)} µg/m³` : '--';
        pm10.textContent = c.pm10 != null ? `${(+c.pm10).toFixed(1)} µg/m³` : '--';
    }

    // ── RENDER WEATHER ────────────────────────────────────────────────────────
    function renderWeather(data, label, opts = {}) {
        if (!data) return;
        wxData = data;
        curLabel = label;

        const cw = data.current || {};
        const code = cw.weathercode ?? 0;
        const day = cw.is_day ?? 1;
        const wi = wxInfo(code, day);

        // Header
        locationName.textContent = (label && typeof label === 'string' ? label : null) || `${data.latitude?.toFixed(2)}°, ${data.longitude?.toFixed(2)}°`;
        updatedAt.textContent = `Updated ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        updateFavBtn(label);
        morphLogo(code, day);

        // Icon + temp
        currentIcon.src = iconUrl(wi.i);
        currentIcon.alt = wi.t;
        currentTemp.textContent = dTemp(cw.temperature_2m);
        currentCond.textContent = wi.t;

        // Glow color by condition
        if (iconGlow) {
            if (code === 0 && day) iconGlow.style.background = 'radial-gradient(circle, rgba(251,191,36,0.35), transparent 70%)';
            else if (code >= 95) iconGlow.style.background = 'radial-gradient(circle, rgba(139,92,246,0.35), transparent 70%)';
            else if (code >= 61) iconGlow.style.background = 'radial-gradient(circle, rgba(6,182,212,0.35), transparent 70%)';
            else iconGlow.style.background = 'radial-gradient(circle, rgba(59,130,246,0.25), transparent 70%)';
        }

        // Hourly index
        const now = new Date();
        const hTimes = data.hourly?.time || [];
        let hi = hTimes.findIndex(t => new Date(t) > now);
        if (hi < 1) hi = 1; hi--;

        feelsLike.textContent = dTemp(data.hourly.apparent_temperature?.[hi]);
        humidity.textContent = `${data.hourly.relative_humidity_2m?.[hi] ?? '--'}%`;
        windSpeed.textContent = `${cw.windspeed_10m ?? '--'} km/h`;
        windDir.textContent = compass(cw.winddirection_10m);
        pressure.textContent = `${Math.round(data.hourly.surface_pressure?.[hi] ?? 0) || '--'} hPa`;
        const visM = data.hourly.visibility?.[hi];
        visibility.textContent = visM != null ? `${(visM / 1000).toFixed(1)} km` : '--';
        sunrise.textContent = fmtTime(data.daily?.sunrise?.[0]);
        sunset.textContent = fmtTime(data.daily?.sunset?.[0]);

        // UV
        const uv = data.daily?.uv_index_max?.[0] ?? null;
        const uvi = uvInfo(uv);
        uvValue.textContent = uv != null ? (+uv).toFixed(1) : '--';
        uvLabel.textContent = uvi.l;
        uvLabel.style.color = uvi.c;
        uvFill.style.width = `${Math.min(uvi.p, 100)}%`;
        uvFill.style.background = uvi.c;

        // Hourly strip
        hourlyEl.innerHTML = '';
        const sIdx = hTimes.findIndex(t => new Date(t) >= now);
        const start = sIdx >= 0 ? sIdx : 0;
        hTimes.slice(start, start + 24).forEach((t, i) => {
            const idx = start + i;
            const hour = new Date(t).getHours();
            const w2 = wxInfo(data.hourly.weathercode?.[idx], hour >= 6 && hour < 19 ? 1 : 0);
            const el = document.createElement('div');
            el.className = 'h-item';
            el.innerHTML = `<div class="h-time">${hour}:00</div><img class="h-img" src="${iconUrl(w2.i)}" alt="${w2.t}"><div class="h-temp">${dTemp(data.hourly.temperature_2m?.[idx])}</div>`;
            hourlyEl.appendChild(el);
        });

        // 7-day
        dailyEl.innerHTML = '';
        (data.daily?.time || []).forEach((date, i) => {
            const day2 = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
            const w3 = wxInfo(data.daily.weathercode?.[i]);
            const precip = data.daily.precipitation_sum?.[i] ?? 0;
            const el = document.createElement('div');
            el.className = 'f-row';
            el.innerHTML = `
                <span class="f-day">${i === 0 ? 'Today' : day2}</span>
                <img class="f-icon" src="${iconUrl(w3.i)}" alt="${w3.t}">
                <span class="f-precip">${(+precip).toFixed(1)}mm</span>
                <span class="f-temps"><span class="f-hi">${dTemp(data.daily.temperature_2m_max?.[i])}</span><span class="f-lo"> / ${dTemp(data.daily.temperature_2m_min?.[i])}</span></span>
            `;
            dailyEl.appendChild(el);
        });

        renderPrecipChart(data);
        renderInsights(data, cw, day);
        renderTempRange(data);

        // Map fly
        if (!opts.fromCache) flyTo(data.latitude, data.longitude);
    }

    // ── PRECIP CHART ──────────────────────────────────────────────────────────
    function renderPrecipChart(data) {
        const canvas = $('precipChart');
        if (!canvas || !data.daily?.time) return;
        const labels = data.daily.time.map((d, i) => i === 0 ? 'Today' : new Date(d).toLocaleDateString('en-US', { weekday: 'short' }));
        const values = (data.daily.precipitation_sum || []).map(v => v ?? 0);
        if (precipChart) precipChart.destroy();
        const dark = theme === 'dark';
        const grid = dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)';
        const ticks = dark ? '#5a7a96' : '#6080a0';
        precipChart = new Chart(canvas, {
            type: 'bar', data: {
                labels,
                datasets: [{
                    data: values, label: 'mm',
                    backgroundColor: 'rgba(59,130,246,0.4)',
                    borderColor: 'rgba(99,170,255,0.85)',
                    borderWidth: 1.5, borderRadius: 8, borderSkipped: false,
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.parsed.y.toFixed(1)} mm` } } },
                scales: {
                    x: { grid: { color: grid }, ticks: { color: ticks, font: { size: 11, family: 'Plus Jakarta Sans' } } },
                    y: { beginAtZero: true, grid: { color: grid }, ticks: { color: ticks, font: { size: 11, family: 'Plus Jakarta Sans' }, callback: v => `${v}mm` } },
                }
            }
        });
    }

    // ── INSIGHTS ──────────────────────────────────────────────────────────────
    function renderInsights(data, cw, isDay) {
        if (!insightsList) return;
        const now = new Date();
        let hIdx = (data.hourly?.time || []).findIndex(t => new Date(t) > now);
        if (hIdx < 1) hIdx = 1; hIdx--;
        const temp = cw.temperature_2m;
        const hum = data.hourly?.relative_humidity_2m?.[hIdx];
        const uv = data.daily?.uv_index_max?.[0];
        const wind = cw.windspeed_10m;
        const code = cw.weathercode ?? 0;
        const vis = data.hourly?.visibility?.[hIdx];
        const precip7 = (data.daily?.precipitation_sum || []).reduce((a, v) => a + (v || 0), 0);
        const maxT = Math.max(...(data.daily?.temperature_2m_max || [0]));
        const minT = Math.min(...(data.daily?.temperature_2m_min || [0]));

        const list = [];
        if (temp > 35) list.push({ e: '🔥', t: 'Heat Alert', d: `${Math.round(temp)}° — stay hydrated and avoid direct sun.` });
        else if (temp < 5) list.push({ e: '🥶', t: 'Cold Alert', d: `${Math.round(temp)}° — dress in warm layers today.` });
        if (uv > 5) list.push({ e: '☀️', t: 'UV Warning', d: `UV index ${(+uv).toFixed(1)} — wear SPF 30+ sunscreen.` });
        if (wind > 40) list.push({ e: '💨', t: 'Strong Winds', d: `Gusts at ${wind} km/h — secure loose outdoor items.` });
        if (hum > 85) list.push({ e: '💦', t: 'High Humidity', d: `${hum}% humidity — expect muggy conditions.` });
        else if (hum < 25) list.push({ e: '🏜️', t: 'Dry Air', d: `Only ${hum}% humidity — stay hydrated.` });
        if (code >= 95) list.push({ e: '⛈️', t: 'Thunderstorm Risk', d: 'Active storm — stay indoors if possible.' });
        if (vis != null && vis < 1000) list.push({ e: '🌫️', t: 'Poor Visibility', d: `Only ${(vis / 1000).toFixed(1)} km — drive carefully.` });
        if (precip7 > 15) list.push({ e: '🌧️', t: 'Rainy Week', d: `${precip7.toFixed(0)}mm of rain forecast over 7 days.` });
        else if (precip7 === 0) list.push({ e: '🌤️', t: 'Dry Spell', d: 'No rain expected in the next 7 days.' });
        list.push({ e: '📊', t: 'Weekly Temp Range', d: `${dTemp(minT)} low to ${dTemp(maxT)} high this week.` });
        if (isDay) list.push({ e: '🌅', t: 'Golden Hour', d: `Sunrise ${fmtTime(data.daily?.sunrise?.[0])} · Sunset ${fmtTime(data.daily?.sunset?.[0])}` });
        else list.push({ e: '🌙', t: 'Night Watch', d: `Sun returns at ${fmtTime(data.daily?.sunrise?.[1] || data.daily?.sunrise?.[0])}` });

        insightsList.innerHTML = '';
        list.slice(0, 5).forEach((ins, i) => {
            const el = document.createElement('div');
            el.className = 'insight-item';
            el.style.animationDelay = `${i * 0.07}s`;
            el.innerHTML = `<div class="i-emoji">${ins.e}</div><div class="i-body"><div class="i-title">${ins.t}</div><div class="i-desc">${ins.d}</div></div>`;
            insightsList.appendChild(el);
        });
    }

    // ── TEMP RANGE ────────────────────────────────────────────────────────────
    function renderTempRange(data) {
        if (!tempRangeList || !data.daily?.time) return;
        const maxAll = Math.max(...(data.daily.temperature_2m_max || [0]));
        const minAll = Math.min(...(data.daily.temperature_2m_min || [0]));
        const span = maxAll - minAll || 1;
        tempRangeList.innerHTML = '';
        data.daily.time.forEach((date, i) => {
            const day = i === 0 ? 'Tod' : new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
            const hi = data.daily.temperature_2m_max?.[i] ?? 0;
            const lo = data.daily.temperature_2m_min?.[i] ?? 0;
            const pct = Math.max(8, Math.min(100, ((hi - minAll) / span) * 100));
            const el = document.createElement('div');
            el.className = 'tr-row';
            el.innerHTML = `<span class="tr-day">${day}</span><div class="tr-track"><div class="tr-fill" style="width:0%" data-p="${pct}"></div></div><span class="tr-hi">${dTemp(hi)}</span><span class="tr-lo">${dTemp(lo)}</span>`;
            tempRangeList.appendChild(el);
        });
        requestAnimationFrame(() => {
            tempRangeList.querySelectorAll('.tr-fill').forEach(el => { el.style.width = el.dataset.p + '%'; });
        });
    }

    // ── FAVOURITES ────────────────────────────────────────────────────────────
    let favs = JSON.parse(localStorage.getItem('favourites') || '[]');
    const saveFavs = () => localStorage.setItem('favourites', JSON.stringify(favs));
    const isFav = label => favs.some(f => f.label === label);
    const updateFavBtn = label => {
        if (!label || !favBtn) return;
        const on = isFav(label);
        favBtn.classList.toggle('starred', on);
        favBtn.title = on ? 'Remove favourite' : 'Add to favourites';
    };
    favBtn?.addEventListener('click', () => {
        if (!curLabel || !wxData) return;
        if (isFav(curLabel)) favs = favs.filter(f => f.label !== curLabel);
        else { favs.unshift({ label: curLabel, lat: wxData.latitude, lon: wxData.longitude }); if (favs.length > 8) favs = favs.slice(0, 8); }
        saveFavs(); renderFavs(); updateFavBtn(curLabel);
    });
    function renderFavs() {
        favChips.innerHTML = '';
        if (!favs.length) { favSection.classList.add('hidden'); return; }
        favSection.classList.remove('hidden');
        favs.forEach(f => {
            const c = document.createElement('button');
            c.className = 'chip'; c.textContent = String(f.label || '').split(',')[0] || String(f.label || '');
            c.onclick = () => fetchByCoords(f.lat, f.lon);
            favChips.appendChild(c);
        });
    }

    // ── RECENTS ───────────────────────────────────────────────────────────────
    let recents = JSON.parse(localStorage.getItem('recentLocations') || '[]');
    function renderRecents() {
        recentChips.innerHTML = '';
        recents.slice(0, 3).forEach(r => {
            const c = document.createElement('button');
            c.className = 'chip'; c.textContent = String(r.label || '').split(',')[0] || String(r.label || '');
            c.onclick = () => fetchByCoords(r.lat, r.lon, typeof r.label === 'string' ? r.label : null);
            recentChips.appendChild(c);
        });
    }
    function addRecent(loc) {
        const i = recents.findIndex(r => r.label === loc.label);
        if (i > -1) recents.splice(i, 1);
        recents.unshift(loc); recents = recents.slice(0, 5);
        localStorage.setItem('recentLocations', JSON.stringify(recents));
        renderRecents();
    }

    // ── FETCH BY COORDS (always reverse geocodes first) ───────────────────────
    async function fetchByCoords(lat, lon, knownLabel = null, opts = {}) {
        showLoad(true);
        try {
            let label = (knownLabel && typeof knownLabel === 'string') ? knownLabel : null;
            if (!label) {
                const geo = await reverseGeocode(lat, lon);
                label = geo.country ? `${geo.name}, ${geo.country}` : String(geo.name);
            }
            await fetchWeather(lat, lon, label, opts);
            addRecent({ lat, lon, label });
        } catch (e) {
            showError(e.message || 'Could not load weather');
        } finally {
            showLoad(false);
        }
    }

    // ── IP-BASED GEOLOCATION FALLBACK ────────────────────────────────────────
    async function ipGeolocate() {
        // BigDataCloud — designed for client-side, works from any origin including file://
        try {
            const res = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client');
            if (res.ok) {
                const d = await res.json();
                if (d.latitude && d.longitude) {
                    return { latitude: d.latitude, longitude: d.longitude, city: d.city || d.locality, country: d.countryName };
                }
            }
        } catch (_) { }

        // ipwho.is fallback
        try {
            const res = await fetch('https://ipwho.is/');
            if (res.ok) {
                const d = await res.json();
                if (d.success !== false && d.latitude && d.longitude) {
                    return { latitude: d.latitude, longitude: d.longitude, city: d.city, country: d.country };
                }
            }
        } catch (_) { }

        // ip-api.com over HTTP (free tier is HTTP-only, but works from file:// origin)
        try {
            const res = await fetch('http://ip-api.com/json/?fields=lat,lon,city,country,status');
            if (res.ok) {
                const d = await res.json();
                if (d.status === 'success' && d.lat && d.lon) {
                    return { latitude: d.lat, longitude: d.lon, city: d.city, country: d.country };
                }
            }
        } catch (_) { }

        throw new Error('Could not determine your location. Please search for a city instead.');
    }

    // Try browser geolocation first, fall back to IP-based on failure
    async function getPosition() {
        // Try native geolocation first
        try {
            const pos = await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000 });
            });
            return { latitude: pos.coords.latitude, longitude: pos.coords.longitude, source: 'gps' };
        } catch (geoErr) {
            // Only fall back for unavailable/timeout, not permission denied
            if (geoErr.code === 1) throw geoErr;
        }
        // Fallback: IP geolocation
        const ip = await ipGeolocate();
        return { latitude: ip.latitude, longitude: ip.longitude, city: ip.city, country: ip.country, source: 'ip' };
    }

    function geoErrMsg(err) {
        if (!err) return 'Unknown location error';
        switch (err.code) {
            case 1: return 'Location access denied — please allow location permission in your browser.';
            case 2: return 'Position unavailable — GPS or network location could not be determined.';
            case 3: return 'Location request timed out — please try again.';
            default: return err.message || 'Unknown location error';
        }
    }

    // ── GEOLOCATION BUTTON ────────────────────────────────────────────────────
    locateBtn?.addEventListener('click', async () => {
        showLoad(true);
        try {
            const loc = await getPosition();
            const label = (loc.city && loc.country) ? `${loc.city}, ${loc.country}` : null;
            await fetchByCoords(loc.latitude, loc.longitude, label, { animateMap: true });
        } catch (err) {
            showError(geoErrMsg(err));
        } finally {
            showLoad(false);
        }
    });

    // ── LIVE LOCATION TRACKING ────────────────────────────────────────────────
    async function startTracking() {
        // Show a pending state
        trackBtn.classList.add('active');
        trackText.textContent = 'Acquiring location…';
        trackBanner.classList.remove('hidden');

        try {
            const loc = await getPosition();
            isTracking = true;
            trackText.textContent = `Tracking · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
            const label = (loc.city && loc.country) ? `${loc.city}, ${loc.country}` : null;
            await fetchByCoords(loc.latitude, loc.longitude, label, { animateMap: true });

            if (loc.source === 'gps') {
                // GPS worked — set up watch + poll for live updates
                trackWatchId = navigator.geolocation.watchPosition(
                    p => {
                        trackText.textContent = `Tracking · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
                        fetchByCoords(p.coords.latitude, p.coords.longitude);
                    },
                    () => { /* silent — poll will still work */ },
                    { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
                );
                trackTimer = setInterval(() => {
                    navigator.geolocation.getCurrentPosition(
                        p => fetchByCoords(p.coords.latitude, p.coords.longitude),
                        () => { },
                        { enableHighAccuracy: false, timeout: 8000 }
                    );
                }, TRACK_INTERVAL_MS);
            } else {
                // IP-based — poll with IP fallback too
                trackTimer = setInterval(async () => {
                    try {
                        const loc2 = await getPosition();
                        fetchByCoords(loc2.latitude, loc2.longitude);
                    } catch (_) { }
                }, TRACK_INTERVAL_MS);
            }
        } catch (err) {
            stopTracking();
            showError(geoErrMsg(err));
        }
    }

    function stopTracking() {
        isTracking = false;
        trackBtn.classList.remove('active');
        trackBanner.classList.add('hidden');
        if (trackWatchId != null) { navigator.geolocation.clearWatch(trackWatchId); trackWatchId = null; }
        if (trackTimer) { clearInterval(trackTimer); trackTimer = null; }
    }

    trackBtn?.addEventListener('click', () => isTracking ? stopTracking() : startTracking());
    stopTrackBtn?.addEventListener('click', () => stopTracking());

    // ── SEARCH ────────────────────────────────────────────────────────────────
    async function handleSearch() {
        const q = searchInput.value.trim();
        if (!q) return;
        showLoad(true);
        try {
            const { latitude, longitude, name, country } = await geocodeCity(q);
            const label = country ? `${name}, ${country}` : name;
            await fetchWeather(latitude, longitude, label);
            addRecent({ lat: latitude, lon: longitude, label });
        } catch (e) {
            showError(e.message || 'City not found');
        } finally {
            showLoad(false);
        }
    }
    searchInput?.addEventListener('keyup', e => { if (e.key === 'Enter') handleSearch(); });
    searchBtn?.addEventListener('click', handleSearch);

    // ── INIT ──────────────────────────────────────────────────────────────────
    renderRecents();
    renderFavs();
    const last = recents[0];
    if (last) fetchByCoords(last.lat, last.lon, last.label);
    else fetchByCoords(51.5072, -0.1276, 'London, United Kingdom');
});