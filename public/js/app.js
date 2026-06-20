/* ============================================
   StreamFlix v3 - CineStream Style
   ============================================ */

const API = '';
const VIDKING = 'https://www.vidking.net/embed';
const TMDB_IMG = 'https://image.tmdb.org/t/p';

const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];

let token = localStorage.getItem('sf_token');
let currentUser = null;
let state = {
  view: 'home',
  history: [],
  exploreType: 'all',
  explorePage: 1,
  filters: {},
  mylistTab: 'all',
  detailData: null,
  totalResults: 0,
};

/* ============ API ============ */
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...opts, headers: { ...headers, ...opts.headers } });
  if (res.status === 401) { logout(); throw new Error('Unauthorized'); }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'API error');
  return data;
}

async function tmdb(path, params = {}) {
  const url = new URL(`/api/tmdb${path}`, window.location.origin);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'all') url.searchParams.set(k, v);
  });
  return api(url.pathname + url.search);
}

function img(path, size = 'w500') {
  if (!path) return '';
  return `${TMDB_IMG}/${size}${path}`;
}

/* ============ AUTH ============ */
async function login(email, password) {
  const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  token = data.token;
  currentUser = data.user;
  localStorage.setItem('sf_token', token);
  showApp();
}

function logout() {
  token = null;
  currentUser = null;
  localStorage.removeItem('sf_token');
  $('#app').style.display = 'none';
  $('#authScreen').style.display = 'flex';
}

async function checkAuth() {
  if (!token) return false;
  try { currentUser = await api('/api/auth/profile'); return true; }
  catch { logout(); return false; }
}

function showApp() {
  $('#authScreen').style.display = 'none';
  $('#app').style.display = 'flex';
  if (currentUser) {
    $('#userAvatar').textContent = currentUser.username.charAt(0).toUpperCase();
    $('#userName').textContent = currentUser.username;
  }
  loadHome();
}

/* ============ NAVIGATION ============ */
function navigate(view) {
  if (state.view !== view) state.history.push(state.view);
  state.view = view;
  $$('.view').forEach(v => v.classList.remove('active'));
  $(`#${view}View`).classList.add('active');
  $$('.sidebar-link').forEach(l => l.classList.toggle('active', l.dataset.view === view));
  $(`#${view}View`).scrollTop = 0;
}

function goBack() {
  if (state.history.length) {
    const prev = state.history.pop();
    state.view = prev;
    $$('.view').forEach(v => v.classList.remove('active'));
    $(`#${prev}View`).classList.add('active');
    $$('.sidebar-link').forEach(l => l.classList.toggle('active', l.dataset.view === prev));
  } else {
    navigate('home');
  }
}

/* ============ HOME ============ */
async function loadHome() {
  try {
    const [tM, tTV] = await Promise.all([
      tmdb('/trending/movie/week'),
      tmdb('/trending/tv/week'),
    ]);

    // Hero
    const items = (tM.results || []).filter(i => i.backdrop_path && i.overview);
    if (items.length) {
      const item = items[Math.floor(Math.random() * Math.min(5, items.length))];
      const year = (item.release_date || '').slice(0, 4);
      const genres = await tmdb('/genre/movie/list').catch(() => ({ genres: [] }));
      const genreNames = (item.genre_ids || []).map(id => genres.genres?.find(g => g.id === id)?.name).filter(Boolean).slice(0, 3);

      $('#heroHome').innerHTML = `
        <div class="hero-home-bg" style="background-image:url(${img(item.backdrop_path, 'original')})"></div>
        <div class="hero-home-content fade-in">
          <div class="hero-badge">Trending</div>
          <h1 class="hero-title">${item.title}</h1>
          <div class="hero-meta">
            <span class="rating">★ ${item.vote_average?.toFixed(1)}</span>
            <span class="dot"></span><span>${year}</span>
            ${genreNames.map(g => `<span class="dot"></span><span>${g}</span>`).join('')}
          </div>
          <p class="hero-desc">${item.overview}</p>
          <div class="hero-buttons">
            <button class="btn btn-accent" onclick="playMovie(${item.id}, '${(item.title||'').replace(/'/g,"\\'")}')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg> Watch Now
            </button>
            <button class="btn btn-ghost" onclick="showDetail('movie', ${item.id})">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg> Details
            </button>
          </div>
        </div>
      `;
    }

    // Sections
    const container = $('#homeSections');
    container.innerHTML = '';

    const rows = [
      { title: 'Trending Now', items: tM.results },
      { title: 'Popular TV Shows', items: tTV.results },
    ];

    for (const row of rows) {
      if (!row.items?.length) continue;
      const el = document.createElement('div');
      el.className = 'section fade-in';
      el.innerHTML = `
        <div class="section-header">
          <h3 class="section-title">${row.title}</h3>
        </div>
        <div class="row-scroll">${row.items.filter(i => i.poster_path).map((item, idx) => `
          <div class="card" tabindex="0" onclick="showDetail('${item.media_type || 'movie'}', ${item.id})">
            <img class="card-poster" src="${img(item.poster_path, 'w342')}" alt="${item.title || item.name}" loading="lazy">
            ${idx < 10 ? `<div class="card-number">${idx + 1}</div>` : ''}
            <div class="card-body">
              <div class="card-title">${item.title || item.name}</div>
              <div class="card-meta">
                <span class="card-rating">★ ${item.vote_average?.toFixed(1) || 'N/A'}</span>
                <span>${(item.release_date || item.first_air_date || '').slice(0, 4)}</span>
              </div>
            </div>
          </div>
        `).join('')}</div>
      `;
      container.appendChild(el);
    }

    // Genre rows
    const genreRows = [
      { title: 'Action', id: 28, type: 'movie' },
      { title: 'Comedy', id: 35, type: 'movie' },
      { title: 'Drama', id: 18, type: 'movie' },
      { title: 'Sci-Fi', id: 878, type: 'movie' },
    ];
    const genreData = await Promise.all(genreRows.map(g => tmdb(`/discover/${g.type}`, { with_genres: g.id, sort_by: 'popularity.desc', page: 1 }).catch(() => null)));
    genreData.forEach((data, idx) => {
      if (!data?.results?.length) return;
      const g = genreRows[idx];
      const el = document.createElement('div');
      el.className = 'section fade-in';
      el.innerHTML = `
        <div class="section-header">
          <h3 class="section-title">${g.title}</h3>
          <span class="section-link" onclick="openExplore('${g.title}', ${g.id})">See all</span>
        </div>
        <div class="row-scroll">${data.results.filter(i => i.poster_path).slice(0, 10).map(i => `
          <div class="card" tabindex="0" onclick="showDetail('movie', ${i.id})">
            <img class="card-poster" src="${img(i.poster_path, 'w342')}" alt="${i.title}" loading="lazy">
            <div class="card-body">
              <div class="card-title">${i.title}</div>
              <div class="card-meta">
                <span class="card-rating">★ ${i.vote_average?.toFixed(1) || 'N/A'}</span>
                <span>${(i.release_date || '').slice(0, 4)}</span>
              </div>
            </div>
          </div>
        `).join('')}</div>
      `;
      container.appendChild(el);
    });
  } catch (e) { console.error('Home failed:', e); }
}

function openExplore(genreName, genreId) {
  navigate('explore');
  state.exploreType = 'all';
  state.filters = { with_genres: genreId };
  state.explorePage = 1;
  $$('.explore-tab').forEach(t => t.classList.toggle('active', t.dataset.type === 'all'));
  loadExploreFilters();
  loadExplore();
}

/* ============ EXPLORE ============ */
async function loadExploreFilters() {
  const [genreData, providerData] = await Promise.all([
    tmdb('/genre/movie/list').catch(() => ({ genres: [] })),
    tmdb('/watch/providers/movie').catch(() => ({ results: [] })),
  ]);

  const container = $('#exploreFilters');
  container.innerHTML = '';

  // Active filters
  if (state.filters.with_genres) {
    const genreName = genreData.genres?.find(g => g.id == state.filters.with_genres)?.name || 'Genre';
    container.innerHTML += `<div class="filter-chip active" onclick="removeFilter('with_genres')">Genre: ${genreName} <span class="x">×</span></div>`;
  }
  if (state.filters.with_watch_providers) {
    container.innerHTML += `<div class="filter-chip active" onclick="removeFilter('with_watch_providers')">Platform: Selected <span class="x">×</span></div>`;
  }
  if (state.filters['vote_average.gte']) {
    container.innerHTML += `<div class="filter-chip active" onclick="removeFilter('vote_average.gte')">Rating: ${state.filters['vote_average.gte']}+ <span class="x">×</span></div>`;
  }
  if (state.filters['primary_release_year']) {
    const year = state.filters['primary_release_year'];
    container.innerHTML += `<div class="filter-chip active" onclick="removeFilter('year')">Year: ${year} <span class="x">×</span></div>`;
  }

  // Dropdowns
  const genres = genreData.genres || [];
  if (genres.length && !state.filters.with_genres) {
    container.appendChild(makeFilterDropdown('Genre', 'with_genres', genres.map(g => ({ value: g.id, label: g.name }))));
  }

  const providers = (providerData.results || []).slice(0, 15);
  if (providers.length && !state.filters.with_watch_providers) {
    container.appendChild(makeFilterDropdown('Platform', 'with_watch_providers', providers.map(p => ({ value: p.provider_id, label: p.provider_name }))));
  }

  const years = [];
  for (let y = 2026; y >= 2000; y--) years.push({ value: y, label: String(y) });
  // Always use movie year param (loadExplore defaults to movie for 'all')
  const yearParam = 'primary_release_year';
  if (!state.filters[yearParam]) {
    container.appendChild(makeFilterDropdown('Year', yearParam, years));
  }

  if (!state.filters['vote_average.gte']) {
    container.appendChild(makeFilterDropdown('Rating', 'vote_average.gte', [
      { value: '', label: 'Any' }, { value: '7', label: '7+' }, { value: '8', label: '8+' }, { value: '9', label: '9+' },
    ]));
  }

  if (Object.keys(state.filters).length) {
    const clear = document.createElement('span');
    clear.className = 'clear-filters';
    clear.textContent = 'Clear All';
    clear.onclick = () => { state.filters = {}; loadExploreFilters(); loadExplore(); };
    container.appendChild(clear);
  }
}

function makeFilterDropdown(label, param, options) {
  const wrap = document.createElement('div');
  wrap.className = 'filter-dropdown';
  const chip = document.createElement('div');
  chip.className = 'filter-chip';
  chip.innerHTML = `${label} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>`;
  const menu = document.createElement('div');
  menu.className = 'filter-menu';
  options.forEach(opt => {
    const item = document.createElement('div');
    item.className = 'filter-menu-item';
    item.textContent = opt.label;
    item.onclick = (e) => {
      e.stopPropagation();
      state.filters[param] = opt.value;
      menu.classList.remove('open');
      loadExploreFilters();
      loadExplore();
    };
    menu.appendChild(item);
  });
  chip.onclick = (e) => {
    e.stopPropagation();
    $$('.filter-menu').forEach(m => { if (m !== menu) m.classList.remove('open'); });
    menu.classList.toggle('open');
  };
  wrap.appendChild(chip);
  wrap.appendChild(menu);
  return wrap;
}

function removeFilter(key) {
  if (key === 'year') {
    delete state.filters['primary_release_year'];
  } else {
    delete state.filters[key];
  }
  loadExploreFilters();
  loadExplore();
}

document.addEventListener('click', () => $$('.filter-menu').forEach(m => m.classList.remove('open')));

async function loadExplore() {
  const grid = $('#exploreGrid');
  if (state.explorePage === 1) grid.innerHTML = '';

  const type = state.exploreType === 'all' ? 'movie' : state.exploreType;
  const params = { ...state.filters, page: state.explorePage, watch_region: 'US', sort_by: 'popularity.desc' };

  // Convert year to strict date range
  const yearParam = type === 'movie' ? 'primary_release_year' : 'first_air_date_year';
  const year = params[yearParam];
  if (year) {
    delete params[yearParam];
    params[type === 'movie' ? 'primary_release_date.gte' : 'first_air_date.gte'] = `${year}-01-01`;
    params[type === 'movie' ? 'primary_release_date.lte' : 'first_air_date.lte'] = `${year}-12-31`;
  }

  try {
    const data = await tmdb(`/discover/${type}`, params);
    state.totalResults = data.total_results || 0;
    (data.results || []).filter(i => i.poster_path).forEach(i => {
      const card = document.createElement('div');
      card.className = 'card fade-in';
      card.tabIndex = 0;
      const mediaType = state.exploreType === 'all' ? (i.title ? 'movie' : 'tv') : state.exploreType;
      card.onclick = () => showDetail(mediaType, i.id);
      card.innerHTML = `
        <img class="card-poster" src="${img(i.poster_path, 'w342')}" alt="${i.title || i.name}" loading="lazy">
        ${i.vote_average >= 8 ? `<div class="card-badge">★ ${i.vote_average.toFixed(1)}</div>` : ''}
        <div class="card-body">
          <div class="card-title">${i.title || i.name}</div>
          <div class="card-meta">
            <span>${(i.release_date || i.first_air_date || '').slice(0, 4)}</span>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
    $('#loadMore').style.display = data.results?.length ? 'block' : 'none';
    $('#loadMoreInfo').textContent = `Showing ${grid.children.length} of ${state.totalResults.toLocaleString()} results`;
  } catch (e) { console.error('Explore failed:', e); }
}

/* ============ MY LIST ============ */
async function loadMyList(tab) {
  state.mylistTab = tab || 'all';
  $$('.mylist-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === state.mylistTab));
  const grid = $('#mylistGrid');
  grid.innerHTML = '<div class="spinner" style="margin:40px auto"></div>';

  try {
    let items = [];
    if (state.mylistTab === 'favorites' || state.mylistTab === 'all') {
      const favs = await api('/api/auth/favorites').catch(() => []);
      if (state.mylistTab === 'favorites') items = favs;
      else items = [...favs];
    }
    if (state.mylistTab === 'watchlist' || state.mylistTab === 'all') {
      const wl = await api('/api/auth/watchlist').catch(() => []);
      if (state.mylistTab === 'watchlist') items = wl;
      else items = [...items, ...wl];
    }
    if (state.mylistTab === 'continue') {
      items = await api('/api/auth/history').catch(() => []);
    }

    // Stats
    const history = await api('/api/auth/history').catch(() => []);
    const favCount = (await api('/api/auth/favorites').catch(() => [])).length;
    const wlCount = (await api('/api/auth/watchlist').catch(() => [])).length;
    const totalHours = history.reduce((sum, h) => sum + (h.progress_seconds || 0), 0) / 3600;

    $('#mylistStats').innerHTML = `
      <div class="stat-card">
        <div class="stat-label">Favorites</div>
        <div class="stat-value">${favCount}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">To Watch</div>
        <div class="stat-value">${wlCount}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Watch Time</div>
        <div class="stat-value">${totalHours.toFixed(0)}<span style="font-size:14px;font-weight:400;color:var(--muted)"> hrs</span></div>
      </div>
    `;

    grid.innerHTML = '';
    if (!items.length) {
      grid.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg><p>Nothing here yet</p></div>';
      return;
    }

    // Dedupe by tmdb_id + media_type
    const seen = new Set();
    items.filter(item => {
      const key = `${item.tmdb_id}-${item.media_type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).forEach(item => {
      const posterURL = item.poster_path ? (item.poster_path.startsWith('http') ? item.poster_path : img(item.poster_path, 'w342')) : '';
      let progressHTML = '';
      if (state.mylistTab === 'continue' && item.duration_seconds > 0) {
        const pct = Math.round((item.progress_seconds / item.duration_seconds) * 100);
        progressHTML = `<div class="episode-progress"><div class="episode-progress-bar" style="width:${pct}%"></div></div>`;
      }
      const card = document.createElement('div');
      card.className = 'card fade-in';
      card.tabIndex = 0;
      card.onclick = () => showDetail(item.media_type, item.tmdb_id);
      card.innerHTML = `
        <img class="card-poster" src="${posterURL}" alt="${item.title || ''}" loading="lazy">
        <div class="card-body">
          <div class="card-title">${item.title || 'Untitled'}</div>
          <div class="card-meta"><span>${item.media_type === 'tv' ? 'Series' : 'Movie'}</span></div>
          ${progressHTML}
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (e) {
    grid.innerHTML = '<div class="empty-state"><p>Failed to load</p></div>';
  }
}

/* ============ FAVORITES / WATCHLIST ============ */
async function checkFav(id, type) {
  try { const f = await api('/api/auth/favorites'); return f.some(x => x.tmdb_id === id && x.media_type === type); }
  catch { return false; }
}
async function checkWL(id, type) {
  try { const w = await api('/api/auth/watchlist'); return w.some(x => x.tmdb_id === id && x.media_type === type); }
  catch { return false; }
}
async function toggleFav(id, type, title, poster) {
  const f = await api('/api/auth/favorites');
  const exists = f.some(x => x.tmdb_id === id && x.media_type === type);
  if (exists) await api(`/api/auth/favorites/${id}/${type}`, { method: 'DELETE' });
  else await api('/api/auth/favorites', { method: 'POST', body: JSON.stringify({ tmdb_id: id, media_type: type, title, poster_path: poster }) });
  return !exists;
}
async function toggleWL(id, type, title, poster) {
  const w = await api('/api/auth/watchlist');
  const exists = w.some(x => x.tmdb_id === id && x.media_type === type);
  if (exists) await api(`/api/auth/watchlist/${id}/${type}`, { method: 'DELETE' });
  else await api('/api/auth/watchlist', { method: 'POST', body: JSON.stringify({ tmdb_id: id, media_type: type, title, poster_path: poster }) });
  return !exists;
}

/* ============ DETAIL ============ */
async function showDetail(type, id) {
  navigate('detail');
  const el = $('#detailView');
  el.innerHTML = '<div class="spinner" style="margin:80px auto"></div>';

  try {
    const data = await tmdb(`/${type}/${id}`, { append_to_response: 'credits,external_ids,similar' });
    state.detailData = { ...data, media_type: type };
    const year = (data.release_date || data.first_air_date || '').slice(0, 4);
    const rating = data.vote_average ? data.vote_average.toFixed(1) : 'N/A';
    const runtime = data.runtime ? `${Math.floor(data.runtime / 60)}h ${data.runtime % 60}m` : '';
    const seasons = data.number_of_seasons ? `${data.number_of_seasons} Season${data.number_of_seasons > 1 ? 's' : ''}` : '';
    const matchPct = Math.round((data.vote_average || 0) * 10);

    const isFav = await checkFav(id, type);
    const inWL = await checkWL(id, type);
    const genres = (data.genres || []).map(g => g.name).slice(0, 3);
    const directors = (data.credits?.crew || []).filter(c => c.job === 'Director').map(c => c.name);
    const cast = (data.credits?.cast || []).slice(0, 6);

    el.innerHTML = `
      <div class="detail-hero">
        <div class="detail-hero-bg" style="background-image:url(${img(data.backdrop_path, 'original')})"></div>
        <div class="detail-hero-content fade-in">
          <div class="detail-badges">
            ${matchPct > 70 ? `<span class="detail-badge badge-match">${matchPct}% MATCH</span>` : ''}
            <span class="detail-badge badge-rating">★ ${rating}</span>
            ${year ? `<span class="detail-badge badge-rating">${year}</span>` : ''}
            ${runtime ? `<span class="detail-badge badge-rating">${runtime}</span>` : ''}
            ${seasons ? `<span class="detail-badge badge-rating">${seasons}</span>` : ''}
          </div>
          <h1 class="detail-title">${data.title || data.name}</h1>
          ${data.tagline ? `<p class="detail-tagline">"${data.tagline}"</p>` : ''}
          <div class="detail-actions">
            <button class="btn btn-accent" onclick="playFromDetail()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg> Watch Now
            </button>
            <button class="btn btn-ghost" id="detailFavBtn" onclick="handleDetailFav()">
              ${isFav ? '&#10003; Favorited' : '&#9825; Favorite'}
            </button>
            <button class="btn btn-ghost" id="detailWLBtn" onclick="handleDetailWL()">
              ${inWL ? '&#10003; In Watchlist' : '+ Watchlist'}
            </button>
          </div>
        </div>
      </div>

      <div class="detail-body">
        <div class="detail-main">
          <div class="detail-tabs">
            <button class="detail-tab active" data-tab="overview">Overview</button>
            <button class="detail-tab" data-tab="similar">Similar</button>
          </div>

          <div id="detailTabContent">
            <div class="detail-tab-panel" data-panel="overview">
              <p class="detail-synopsis">${data.overview || 'No description available.'}</p>

              ${directors.length ? `<div class="detail-label">Director</div><div class="detail-value accent">${directors.join(', ')}</div>` : ''}

              ${cast.length ? `
                <div class="detail-label" style="margin-top:16px">Top Cast</div>
                <div class="cast-grid">
                  ${cast.map(c => `
                    <div class="cast-card">
                      ${c.profile_path ? `<img class="cast-img" src="${img(c.profile_path, 'w185')}" alt="${c.name}" loading="lazy">` : `<div class="cast-img"></div>`}
                      <div class="cast-name">${c.name}</div>
                      <div class="cast-role">${c.character || ''}</div>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              ${genres.length ? `<div class="detail-label">Genres</div><div class="detail-value">${genres.map(g => `<span style="display:inline-block;padding:3px 10px;background:var(--bg-card);border-radius:4px;margin:2px 4px 2px 0;font-size:12px">${g}</span>`).join('')}</div>` : ''}
            </div>

            <div class="detail-tab-panel" data-panel="similar" style="display:none">
              <div class="row-scroll" style="gap:12px">
                ${(data.similar?.results || []).filter(i => i.poster_path).slice(0, 10).map(i => `
                  <div class="card" tabindex="0" onclick="showDetail('${type}', ${i.id})">
                    <img class="card-poster" src="${img(i.poster_path, 'w342')}" alt="${i.title || i.name}" loading="lazy">
                    <div class="card-body">
                      <div class="card-title">${i.title || i.name}</div>
                      <div class="card-meta"><span class="card-rating">★ ${i.vote_average?.toFixed(1) || 'N/A'}</span></div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <div class="detail-sidebar">
          <div class="detail-info-card">
            ${data.original_language ? `<div class="detail-info-row"><div class="detail-label">Language</div><div class="detail-value">${data.original_language.toUpperCase()}</div></div>` : ''}
            ${data.status ? `<div class="detail-info-row"><div class="detail-label">Status</div><div class="detail-value">${data.status}</div></div>` : ''}
            ${data.number_of_episodes ? `<div class="detail-info-row"><div class="detail-label">Episodes</div><div class="detail-value">${data.number_of_episodes}</div></div>` : ''}
            ${data.budget ? `<div class="detail-info-row"><div class="detail-label">Budget</div><div class="detail-value">$${(data.budget / 1e6).toFixed(0)}M</div></div>` : ''}
            ${data.revenue ? `<div class="detail-info-row"><div class="detail-label">Revenue</div><div class="detail-value">$${(data.revenue / 1e6).toFixed(0)}M</div></div>` : ''}
          </div>

          <div class="sidebar-actions">
            <button class="sidebar-action-btn" onclick="handleDetailFav()">
              <svg viewBox="0 0 24 24" fill="${isFav ? 'var(--accent)' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              <span>${isFav ? 'Favorited' : 'Add to Favorites'}</span>
            </button>
            <button class="sidebar-action-btn" onclick="handleDetailWL()">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
              <span>${inWL ? 'In Watchlist' : 'Add to Watchlist'}</span>
            </button>
          </div>
        </div>
      </div>
    `;

    // Detail tabs
    $$('.detail-tab').forEach(tab => {
      tab.onclick = () => {
        $$('.detail-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        $$('.detail-tab-panel').forEach(p => p.style.display = 'none');
        $(`.detail-tab-panel[data-panel="${tab.dataset.tab}"]`).style.display = '';
      };
    });

    // Seasons for TV
    if (type === 'tv' && data.seasons?.length) {
      const seasonsHTML = `
        <div style="margin-top:20px">
          <div class="section-header"><h3 class="section-title">Seasons</h3></div>
          <div class="row-scroll" style="gap:10px">
            ${data.seasons.filter(s => s.season_number > 0).map(s => `
              <div class="card" style="width:120px" onclick="showTVSeason(${id}, ${s.season_number}, '${(data.name||'').replace(/'/g,"\\'")}')">
                ${s.poster_path ? `<img class="card-poster" src="${img(s.poster_path, 'w185')}" loading="lazy" style="aspect-ratio:2/3">` : `<div class="card-poster"></div>`}
                <div class="card-body">
                  <div class="card-title">Season ${s.season_number}</div>
                  <div class="card-meta"><span>${s.episode_count} eps</span></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      el.insertAdjacentHTML('beforeend', seasonsHTML);
    }
  } catch (e) {
    el.innerHTML = '<div class="empty-state"><p>Failed to load details</p></div>';
  }
}

window.handleDetailFav = async function() {
  if (!state.detailData) return;
  const d = state.detailData;
  const result = await toggleFav(d.id, d.media_type, d.title || d.name, d.poster_path);
  if (result !== null) {
    $('#detailFavBtn').innerHTML = result ? '&#10003; Favorited' : '&#9825; Favorite';
  }
};

window.handleDetailWL = async function() {
  if (!state.detailData) return;
  const d = state.detailData;
  const result = await toggleWL(d.id, d.media_type, d.title || d.name, d.poster_path);
  if (result !== null) {
    $('#detailWLBtn').innerHTML = result ? '&#10003; In Watchlist' : '+ Watchlist';
  }
};

window.showTVSeason = async function(tvId, season, showName) {
  const el = $('#detailView');
  el.innerHTML = `<div class="spinner" style="margin:80px auto"></div>`;
  try {
    const data = await tmdb(`/tv/${tvId}/season/${season}`);
    el.innerHTML = `
      <div style="margin-bottom:16px">
        <button class="btn btn-ghost btn-sm" onclick="showDetail('tv', ${tvId})" style="margin-bottom:12px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg> Back to ${showName}
        </button>
        <h2 style="font-size:22px;font-weight:700;margin-bottom:4px">${showName}</h2>
        <p style="color:var(--text2);font-size:14px">Season ${season} · ${data.episodes?.length || 0} episodes</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        ${(data.episodes || []).map(ep => `
          <div class="card" style="width:100%;display:flex;flex-direction:row;border-radius:10px;overflow:hidden;cursor:pointer" onclick="playEpisode(${tvId}, ${season}, ${ep.episode_number}, '${showName.replace(/'/g,"\\'")}')">
            ${ep.still_path ? `<img src="${img(ep.still_path, 'w300')}" style="width:200px;height:112px;object-fit:cover;flex-shrink:0" loading="lazy">` : `<div style="width:200px;height:112px;background:#1a1a24;flex-shrink:0"></div>`}
            <div class="card-body" style="flex:1;display:flex;flex-direction:column;justify-content:center">
              <div class="card-meta" style="margin-bottom:4px"><span>E${ep.episode_number}</span>${ep.air_date ? `<span>· ${ep.air_date}</span>` : ''}</div>
              <div class="card-title" style="white-space:normal">${ep.name}</div>
              <div style="font-size:12px;color:var(--muted);margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${(ep.overview || '').replace(/<[^>]*>/g, '').slice(0, 120)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (e) {
    el.innerHTML = '<div class="empty-state"><p>Failed to load season</p></div>';
  }
};

/* ============ PLAYER ============ */
function playMovie(tmdbId, title) {
  openPlayer(`${VIDKING}/movie/${tmdbId}?color=c8ff00&nextEpisode=true&episodeSelector=true`, title, tmdbId, 'movie');
}

function playEpisode(tvId, season, episode, showName) {
  openPlayer(`${VIDKING}/tv/${tvId}/${season}/${episode}?color=c8ff00&nextEpisode=true&episodeSelector=true`, `${showName} - S${season}E${episode}`, tvId, 'tv', season, episode);
}

async function playFromDetail() {
  if (!state.detailData) return;
  const d = state.detailData;
  if (d.media_type === 'movie') playMovie(d.id, d.title || d.name);
  else playEpisode(d.id, 1, 1, d.name);
}

let progressHandler = null;
function openPlayer(url, title, tmdbId, mediaType, season, episode) {
  const overlay = $('#playerOverlay');
  overlay.classList.add('active');
  $('#playerTitle').textContent = title || '';
  $('#playerFrame').src = url;
  window.open = () => null;

  // Progress tracking via postMessage
  if (token && tmdbId) {
    progressHandler = (event) => {
      if (typeof event.data !== 'string') return;
      try {
        const msg = JSON.parse(event.data);
        if (msg.type !== 'PLAYER_EVENT' || !msg.data) return;
        const { currentTime, duration, event: evt } = msg.data;
        if (['timeupdate', 'pause', 'ended', 'seeked'].includes(evt)) {
          api('/api/auth/history', {
            method: 'POST',
            body: JSON.stringify({
              tmdb_id: tmdbId, media_type: mediaType || 'movie', title,
              poster_path: state.detailData?.poster_path, backdrop_path: state.detailData?.backdrop_path,
              season: season || 1, episode: episode || 1,
              progress_seconds: Math.floor(currentTime || 0), duration_seconds: Math.floor(duration || 0),
            }),
          }).catch(() => {});
        }
      } catch {}
    };
    window.addEventListener('message', progressHandler);
  }
}

function closePlayer() {
  $('#playerOverlay').classList.remove('active');
  $('#playerFrame').src = '';
  if (progressHandler) {
    window.removeEventListener('message', progressHandler);
    progressHandler = null;
  }
}

/* ============ SEARCH ============ */
let searchTimeout;
async function doSearch(query) {
  if (!query.trim()) return;
  navigate('explore');
  state.exploreType = 'all';
  state.filters = {};
  const grid = $('#exploreGrid');
  grid.innerHTML = '<div class="spinner" style="margin:40px auto;grid-column:1/-1"></div>';

  try {
    const data = await tmdb('/search/multi', { query, page: 1 });
    grid.innerHTML = '';
    (data.results || [])
      .filter(i => (i.media_type === 'movie' || i.media_type === 'tv') && i.poster_path)
      .forEach(i => {
        const card = document.createElement('div');
        card.className = 'card fade-in';
        card.tabIndex = 0;
        card.onclick = () => showDetail(i.media_type, i.id);
        card.innerHTML = `
          <img class="card-poster" src="${img(i.poster_path, 'w342')}" alt="${i.title || i.name}" loading="lazy">
          <div class="card-body">
            <div class="card-title">${i.title || i.name}</div>
            <div class="card-meta">
              <span class="card-rating">★ ${i.vote_average?.toFixed(1) || 'N/A'}</span>
              <span>${i.media_type === 'tv' ? 'Series' : 'Movie'}</span>
            </div>
          </div>
        `;
        grid.appendChild(card);
      });
    if (!grid.children.length) grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><p>No results found</p></div>';
    $('#loadMore').style.display = 'none';
  } catch (e) {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><p>Search failed</p></div>';
  }
}

/* ============ KEYBOARD ============ */
document.addEventListener('keydown', (e) => {
  if ($('#authScreen').style.display !== 'none') return;
  if ($('#playerOverlay').classList.contains('active')) {
    if (e.key === 'Escape') closePlayer();
    return;
  }
  if (e.key === 'Escape' && state.view !== 'home') goBack();
});

/* ============ INIT ============ */
async function init() {
  setTimeout(() => $('#loadingSpinner').classList.add('hidden'), 300);

  // Login
  $('#loginBtn').onclick = async () => {
    const email = $('#loginEmail').value.trim();
    const password = $('#loginPassword').value;
    if (!email || !password) { $('#loginError').textContent = 'All fields required'; return; }
    $('#loginBtn').disabled = true;
    try { await login(email, password); }
    catch (e) { $('#loginError').textContent = e.message || 'Login failed'; }
    $('#loginBtn').disabled = false;
  };
  $('#loginPassword').addEventListener('keydown', e => { if (e.key === 'Enter') $('#loginBtn').click(); });
  $('#loginEmail').addEventListener('keydown', e => { if (e.key === 'Enter') $('#loginBtn').click(); });

  // Sidebar nav
  $$('.sidebar-link').forEach(link => {
    link.onclick = () => {
      const view = link.dataset.view;
      if (view === 'home') { state.history = []; navigate('home'); loadHome(); }
      else if (view === 'explore') { state.history = []; navigate('explore'); state.explorePage = 1; state.filters = {}; loadExploreFilters(); loadExplore(); }
      else if (view === 'mylist') { state.history = []; navigate('mylist'); loadMyList(); }
    };
  });

  // Explore tabs
  $$('.explore-tab').forEach(tab => {
    tab.onclick = () => {
      state.exploreType = tab.dataset.type;
      state.explorePage = 1;
      state.filters = {};
      $$('.explore-tab').forEach(t => t.classList.toggle('active', t === tab));
      loadExploreFilters();
      loadExplore();
    };
  });

  // My list tabs
  $$('.mylist-tab').forEach(tab => {
    tab.onclick = () => loadMyList(tab.dataset.tab);
  });

  // Search
  $('#searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => doSearch(e.target.value), 500);
  });
  $('#searchInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { clearTimeout(searchTimeout); doSearch(e.target.value); }
  });

  // Load more
  $('#loadMoreBtn').onclick = () => { state.explorePage++; loadExplore(); };

  // Player back
  $('#playerBack').onclick = closePlayer;

  // Logout
  $('#logoutBtn').onclick = logout;

  // Check auth
  const isAuth = await checkAuth();
  if (isAuth) showApp();
  else $('#authScreen').style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', init);
