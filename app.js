document.addEventListener('DOMContentLoaded', () => {
    const OPENCAGE_API_KEY = '974593a4e67747fbb5d3fc16b4557a51'; 
    const WEATHER_CACHE_TTL = 10 * 60 * 1000; 
    const GEOCODE_CACHE_TTL = 24 * 60 * 60 * 1000;

    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const locateBtn = document.getElementById('locateBtn');
    const locationNameEl = document.getElementById('locationName');
    const updatedAtEl = document.getElementById('updatedAt');
    const currentIconEl = document.getElementById('currentIcon');
    const currentTempEl = document.getElementById('currentTemp');
    const currentConditionEl = document.getElementById('currentCondition');
    const feelsLikeEl = document.getElementById('feelsLike');
    const humidityEl = document.getElementById('humidity');
    const windSpeedEl = document.getElementById('windSpeed');
    const pressureEl = document.getElementById('pressure');
    const hourlyContainer = document.getElementById('hourlyContainer');
    const dailyContainer = document.getElementById('dailyContainer');
    const loadingOverlay = document.getElementById('loading');
    const recentChips = document.getElementById('recentChips');

    const geoCache = new Map(); 
    const weatherCache = new Map();

    
    function showLoading(on = true) {
        if (on) loadingOverlay.classList.remove('hidden');
        else loadingOverlay.classList.add('hidden');
    }

    function showError(msg) {
        showLoading(false);
        console.error(msg);
        alert(msg);
    }

    function formatTime(ts) {
        const d = new Date(ts);
        return d.toLocaleString();
    }

    function keyForCoords(lat, lon) {
        return `${lat.toFixed(4)},${lon.toFixed(4)}`;
    }

    let currentAbortController = null;
    function cancelOngoing() {
        if (currentAbortController) {
            try { currentAbortController.abort(); } catch(e) {}
            currentAbortController = null;
        }
    }

    function getWeatherInfo(code, is_day = 1) {
        const map = {
            0: {desc: 'Clear sky', icon: `01${is_day ? 'd' : 'n'}`},
            1: {desc: 'Mainly clear', icon: `02${is_day ? 'd' : 'n'}`},
            2: {desc: 'Partly cloudy', icon: `03${is_day ? 'd' : 'n'}`},
            3: {desc: 'Overcast', icon: `04${is_day ? 'd' : 'n'}`},
            45: {desc: 'Fog', icon: '50d'},
            48: {desc: 'Rime fog', icon: '50d'},
            51: {desc: 'Light drizzle', icon: '09d'},
            53: {desc: 'Drizzle', icon: '09d'},
            55: {desc: 'Dense drizzle', icon: '09d'},
            61: {desc: 'Slight rain', icon: '10d'},
            63: {desc: 'Rain', icon: '10d'},
            65: {desc: 'Heavy rain', icon: '09d'},
            71: {desc: 'Light snow', icon: '13d'},
            73: {desc: 'Snow', icon: '13d'},
            75: {desc: 'Heavy snow', icon: '13d'},
            80: {desc: 'Rain showers', icon: '09d'},
            81: {desc: 'Moderate showers', icon: '10d'},
            82: {desc: 'Violent showers', icon: '11d'},
            95: {desc: 'Thunderstorm', icon: '11d'},
            96: {desc: 'Thunderstorm + hail', icon: '11d'},
            99: {desc: 'Severe', icon: '11d'}
        };
        return map[code] || {desc: 'Unknown', icon: `01${is_day ? 'd' : 'n'}`};
    }

    function iconUrlFor(code) {
        return `https://openweathermap.org/img/wn/${code}@2x.png`;
    }

   
    const map = L.map('map', {attributionControl: false}).setView([20.5937, 78.9629], 5);
   L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 20,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>'
}).addTo(map);


    let marker = null;

    map.on('click', (e) => {
        const {lat, lng} = e.latlng;
        fetchLocationNameByCoords(lat, lng, {animateMap: true});
    });

    
    locateBtn?.addEventListener('click', () => {
        if (!navigator.geolocation) {
            showError('Geolocation not supported');
            return;
        }
        showLoading(true);
        navigator.geolocation.getCurrentPosition(pos => {
            const {latitude, longitude} = pos.coords;
            fetchLocationNameByCoords(latitude, longitude, {animateMap: true});
        }, (err) => {
            showLoading(false);
            showError('Unable to retrieve location: ' + (err.message || err));
        }, {enableHighAccuracy: false, timeout: 8000});
    });

   
    async function geocodeCity(query) {
        if (!query) throw new Error('Empty query');
        const key = `gc:${query.toLowerCase()}`;
        const cached = geoCache.get(key);
        const now = Date.now();
        if (cached && (now - cached.ts) < GEOCODE_CACHE_TTL) return cached.data;
        
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
        currentAbortController = new AbortController();
        const res = await fetch(url, {signal: currentAbortController.signal});
        const json = await res.json();

        if (!json.results || !json.results.length) throw new Error('Location not found');
        const r = json.results[0];
        const out = {latitude: r.latitude, longitude: r.longitude, name: r.name, country: r.country};
        geoCache.set(key, {ts: now, data: out});
        return out;
    }
    
    
    async function reverseGeocode(lat, lon) {
        const key = `rg:${Math.round(lat*1000)},${Math.round(lon*1000)}`;
        const now = Date.now();
        const cached = geoCache.get(key);
        if (cached && (now - cached.ts) < GEOCODE_CACHE_TTL) return cached.data;

        const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lon}&key=${OPENCAGE_API_KEY}&no_annotations=1&language=en&limit=1`;
        currentAbortController = new AbortController();
        const res = await fetch(url, {signal: currentAbortController.signal});
        const json = await res.json();
        
        const r = json.results?.[0];
        const comps = r?.components || {};
        const name = comps.city || comps.town || comps.village || r?.formatted?.split(',')[0] || `${lat.toFixed(2)},${lon.toFixed(2)}`;
        const out = {name, country: comps.country || ''};
        geoCache.set(key, {ts: now, data: out});
        return out;
    }

    
    async function fetchWeatherByCoords(lat, lon, label = null, opts = {}) {
        const k = keyForCoords(lat, lon);
        const now = Date.now();
        const cached = weatherCache.get(k);

        if (cached && (now - cached.ts) < WEATHER_CACHE_TTL) {
            renderWeather(cached.data, label || cached.label, {fromCache: true});
            return cached.data;
        }

        showLoading(true);
        cancelOngoing();
        currentAbortController = new AbortController();

        const hourly = 'temperature_2m,apparent_temperature,relative_humidity_2m,weathercode,surface_pressure,windspeed_10m';
        const daily = 'weathercode,temperature_2m_max,temperature_2m_min';
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode,windspeed_10m&hourly=${hourly}&daily=${daily}&timezone=auto&forecast_days=7`;
        
        try {
            const resp = await fetch(url, {signal: currentAbortController.signal});
            if (!resp.ok) throw new Error('Weather API error: ' + resp.status);
            const json = await resp.json();
            weatherCache.set(k, {ts: Date.now(), data: json, label});
            renderWeather(json, label, {fromCache: false});
            return json;
        } catch (err) {
            if (err.name === 'AbortError') return;
            showError(err.message || err);
            throw err;
        } finally {
            showLoading(false);
            currentAbortController = null;
        }
    }

    
    function renderWeather(data, label = null, meta = {}) {
        if (!data) return;

        const cw = data.current || {};
        const latlng = [data.latitude, data.longitude];
        
        if (label) locationNameEl.textContent = label;
        else locationNameEl.textContent = `Lat ${data.latitude?.toFixed(2)}, Lon ${data.longitude?.toFixed(2)}`;

        const temp = cw.temperature_2m ?? '--';
        const weatherCode = cw.weathercode ?? 0;
        const isDay = cw.is_day ?? 1;
        const wi = getWeatherInfo(weatherCode, isDay);

        currentTempEl.textContent = `${Math.round(temp)}°`;
        currentConditionEl.textContent = wi.desc;
        currentIconEl.src = iconUrlFor(wi.icon);
        currentIconEl.alt = wi.desc;

        const hourlyIndex = data.hourly.time.findIndex(t => new Date(t) > new Date()) || 0;

        feelsLikeEl.textContent = `${Math.round(data.hourly.apparent_temperature[hourlyIndex] ?? temp)}°`;
        humidityEl.textContent = `${data.hourly.relative_humidity_2m[hourlyIndex] ?? '--'}%`;
        windSpeedEl.textContent = `${(cw.windspeed_10m ?? '--')} km/h`;
        pressureEl.textContent = `${Math.round(data.hourly.surface_pressure[hourlyIndex] ?? '--')} hPa`;

        updatedAtEl.textContent = `Updated: ${formatTime(Date.now())}`;

        
        hourlyContainer.innerHTML = '';
        if (data.hourly && data.hourly.time) {
            const startIndex = data.hourly.time.findIndex(t => new Date(t) >= new Date()) || 0;
            const hoursToShow = data.hourly.time.slice(startIndex, startIndex + 24);

            hoursToShow.forEach((time, i) => {
                const idx = startIndex + i;
                const t = new Date(time);
                const hour = t.getHours();
                const tempHour = Math.round(data.hourly.temperature_2m[idx]);
                const code = data.hourly.weathercode[idx];
                const wi2 = getWeatherInfo(code, (hour >= 6 && hour < 19) ? 1 : 0);
                
                const el = document.createElement('div');
                el.className = 'hourly-item';
                el.innerHTML = `
                    <div>${hour}:00</div>
                    <img src="${iconUrlFor(wi2.icon)}" alt="${wi2.desc}" title="${wi2.desc}">
                    <div class="font-weight:600;">${tempHour}°</div>
                `;
                hourlyContainer.appendChild(el);
            });
        }
        
        
        dailyContainer.innerHTML = '';
        if (data.daily && data.daily.time) {
            data.daily.time.forEach((date, idx) => {
                const day = new Date(date).toLocaleDateString('en-US', { weekday: 'short' });
                const code = data.daily.weathercode[idx];
                const tempMax = Math.round(data.daily.temperature_2m_max[idx]);
                const tempMin = Math.round(data.daily.temperature_2m_min[idx]);
                const wi3 = getWeatherInfo(code);

                const el = document.createElement('div');
                el.className = 'daily-item';
                el.innerHTML = `
                    <div style="flex:1; font-weight:600;">${idx === 0 ? 'Today' : day}</div>
                    <img src="${iconUrlFor(wi3.icon)}" alt="${wi3.desc}">
                    <div style="flex:1; text-align:right;">
                        <span style="font-weight:600;">${tempMax}°</span> / 
                        <span style="color:var(--muted);">${tempMin}°</span>
                    </div>
                `;
                dailyContainer.appendChild(el);
            });
        }

      
        if (latlng && !meta.fromCache) {
            map.flyTo(latlng, 10);
            if (marker) marker.setLatLng(latlng);
            else marker = L.marker(latlng).addTo(map);
        }
    }
    
    async function fetchLocationNameByCoords(lat, lon, opts = {}) {
        showLoading(true);
        try {
            const {name, country} = await reverseGeocode(lat, lon);
            const label = country ? `${name}, ${country}` : name;
            await fetchWeatherByCoords(lat, lon, label, opts);
            addRecentLocation({lat, lon, label});
        } catch (err) {
            showError(err.message || err);
        } finally {
            showLoading(false);
        }
    }
    

    const handleSearch = async () => {
        const query = searchInput.value.trim();
        if (!query) return;

        showLoading(true);
        try {
            const {latitude, longitude, name, country} = await geocodeCity(query);
            const label = country ? `${name}, ${country}` : name;
            await fetchWeatherByCoords(latitude, longitude, label);
            addRecentLocation({lat: latitude, lon: longitude, label});
        } catch (err) {
            showError(err.message || 'Could not find location.');
        } finally {
            showLoading(false);
        }
    };
    
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    searchBtn.addEventListener('click', handleSearch);

   
    let recentLocations = JSON.parse(localStorage.getItem('recentLocations')) || [];

    function renderRecents() {
        recentChips.innerHTML = '';
        recentLocations.slice(0, 3).forEach(loc => {
            const chip = document.createElement('button');
            chip.className = 'chip';
            chip.textContent = loc.label.split(',')[0]; 
            chip.onclick = () => {
                searchInput.value = loc.label;
                fetchWeatherByCoords(loc.lat, loc.lon, loc.label);
            };
            recentChips.appendChild(chip);
        });
    }

    function addRecentLocation(loc) {
        
        const existingIndex = recentLocations.findIndex(r => r.label === loc.label);
        if (existingIndex > -1) {
            recentLocations.splice(existingIndex, 1);
        }
        recentLocations.unshift(loc);
        recentLocations = recentLocations.slice(0, 5); 
        localStorage.setItem('recentLocations', JSON.stringify(recentLocations));
        renderRecents();
    }
    
    
    function initialize() {
        renderRecents();
        
        const lastLoc = recentLocations[0];
        if (lastLoc) {
            fetchWeatherByCoords(lastLoc.lat, lastLoc.lon, lastLoc.label);
        } else {
            fetchWeatherByCoords(51.5072, -0.1276, "London, United Kingdom");
        }
    }

    initialize();

});

