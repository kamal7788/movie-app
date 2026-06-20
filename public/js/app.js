/* ============================================
   StreamFlix v3 - CineStream Style
   ============================================ */

const API = 'https://streamflix.kamalparajuli.com.np';
const VIDKING = 'https://www.vidking.net/embed';
const TMDB_IMG = 'https://image.tmdb.org/t/p';

const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];
const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

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
    const adminLink = $('#adminLink');
    const mobileAdminLink = $('#mobileAdminLink');
    if (currentUser.is_admin) {
      if (adminLink) adminLink.style.display = '';
      if (mobileAdminLink) mobileAdminLink.style.display = '';
    } else {
      if (adminLink) adminLink.style.display = 'none';
      if (mobileAdminLink) mobileAdminLink.style.display = 'none';
    }
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
  $$('.mobile-nav-item').forEach(l => l.classList.toggle('active', l.dataset.view === view));
  $(`#${view}View`).scrollTop = 0;

  if (view === 'admin') loadAdminUsers();
  if (view === 'profile') loadProfile();
}

function goBack() {
  if ($('#playerOverlay').classList.contains('active')) {
    if (document.fullscreenElement || document.webkitFullscreenElement) toggleFullscreen();
    closePlayer();
    return;
  }
  if (state.history.length) {
    const prev = state.history.pop();
    state.view = prev;
    $$('.view').forEach(v => v.classList.remove('active'));
    $(`#${prev}View`).classList.add('active');
    $$('.sidebar-link').forEach(l => l.classList.toggle('active', l.dataset.view === prev));
    $$('.mobile-nav-item').forEach(l => l.classList.toggle('active', l.dataset.view === prev));
  } else {
    navigate('home');
  }
}
window.goBack = goBack;

/* ============ FULLSCREEN ============ */
function toggleFullscreen() {
  const overlay = $('#playerOverlay');
  const el = document.documentElement;

  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    overlay.classList.add('fullscreen');
  } else {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    overlay.classList.remove('fullscreen');
  }
}
window.toggleFullscreen = toggleFullscreen;

document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) $('#playerOverlay').classList.remove('fullscreen');
});
document.addEventListener('webkitfullscreenchange', () => {
  if (!document.webkitFullscreenElement) $('#playerOverlay').classList.remove('fullscreen');
});

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
    if (menu.classList.contains('open')) {
      menu.classList.remove('open');
    } else {
      const rect = chip.getBoundingClientRect();
      menu.style.top = (rect.bottom + 4) + 'px';
      menu.style.left = rect.left + 'px';
      menu.classList.add('open');
    }
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

document.addEventListener('click', (e) => {
  // Don't close menus if clicking inside a menu or its chip
  if (e.target.closest('.filter-dropdown')) return;
  $$('.filter-menu').forEach(m => m.classList.remove('open'));
});

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
      <button class="btn btn-ghost btn-sm detail-back-btn" onclick="goBack()" style="margin-bottom:12px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg> Back
      </button>
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
          <div class="card episode-card" onclick="playEpisode(${tvId}, ${season}, ${ep.episode_number}, '${showName.replace(/'/g,"\\'")}')">
            ${ep.still_path ? `<img src="${img(ep.still_path, 'w300')}" class="episode-thumb" loading="lazy">` : `<div class="episode-thumb"></div>`}
            <div class="card-body" style="flex:1;display:flex;flex-direction:column;justify-content:center">
              <div class="card-meta" style="margin-bottom:4px"><span>E${ep.episode_number}</span>${ep.air_date ? `<span>· ${ep.air_date}</span>` : ''}</div>
              <div class="card-title" style="white-space:normal">${ep.name}</div>
              <div class="episode-overview">${(ep.overview || '').replace(/<[^>]*>/g, '').slice(0, 120)}</div>
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

  // On TV, focus the back button so D-pad works immediately
  if (document.body.classList.contains('tv-mode')) {
    setTimeout(function() { document.getElementById('playerBack').focus(); }, 300);
  }

  // Progress tracking via postMessage
  if (token && tmdbId) {
    progressHandler = (event) => {
      try {
        let data = null;
        if (typeof event.data === 'string') {
          const msg = JSON.parse(event.data);
          // VidKing多种格式: {type:'PLAYER_EVENT', data:{...}} or {event:'timeupdate', currentTime:..., duration:...} or {name:'timeupdate', args:[...]}
          if (msg.type === 'PLAYER_EVENT' && msg.data) {
            data = msg.data;
          } else if (msg.event && (msg.currentTime !== undefined || msg.duration !== undefined)) {
            data = { currentTime: msg.currentTime, duration: msg.duration, event: msg.event };
          } else if (msg.name && msg.args) {
            data = { currentTime: msg.args[0], duration: msg.args[1], event: msg.name };
          }
        } else if (event.data && typeof event.data === 'object') {
          if (event.data.type === 'PLAYER_EVENT' && event.data.data) {
            data = event.data.data;
          } else if (event.data.event) {
            data = event.data;
          }
        }
        if (!data) return;
        const { currentTime, duration, event: evt } = data;
        if (['timeupdate', 'pause', 'ended', 'seeked', 'play', 'playing'].includes(evt)) {
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
  if (!query.trim()) {
    // If search is cleared, reload explore if we're on explore view
    if (state.view === 'explore') { loadExplore(); }
    return;
  }
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
    if (e.key === 'Escape') {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        toggleFullscreen();
      } else {
        closePlayer();
      }
    }
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
      else if (view === 'admin') { state.history = []; navigate('admin'); }
      else if (view === 'profile') { state.history = []; navigate('profile'); }
    };
  });

  // Mobile bottom nav
  $$('.mobile-nav-item').forEach(link => {
    link.onclick = () => {
      const view = link.dataset.view;
      if (view === 'home') { state.history = []; navigate('home'); loadHome(); }
      else if (view === 'explore') { state.history = []; navigate('explore'); state.explorePage = 1; state.filters = {}; loadExploreFilters(); loadExplore(); }
      else if (view === 'mylist') { state.history = []; navigate('mylist'); loadMyList(); }
      else if (view === 'admin') { state.history = []; navigate('admin'); }
      else if (view === 'profile') { state.history = []; navigate('profile'); }
    };
  });

  // Admin modal
  $('#addUserBtn').onclick = openAddUserModal;
  $('#closeModal').onclick = () => { $('#userModal').style.display = 'none'; };
  $('#modalCancelBtn').onclick = () => { $('#userModal').style.display = 'none'; };
  $('#modalSaveBtn').onclick = saveUser;

  // Profile change password
  $('#changePassBtn').onclick = changeOwnPassword;

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

  // Search toggle
  const searchContainer = $('#topbarSearch');
  const searchToggle = $('#searchToggle');
  const searchInput = $('#searchInput');
  searchToggle.onclick = (e) => {
    e.stopPropagation();
    searchContainer.classList.toggle('open');
    if (searchContainer.classList.contains('open')) {
      // On TV, don't focus the input — D-pad navigates the button instead
      if (!document.body.classList.contains('tv-mode')) {
        searchInput.focus();
      }
    } else {
      searchInput.value = '';
      doSearch('');
    }
  };
  document.addEventListener('click', (e) => {
    if (!searchContainer.contains(e.target)) {
      searchContainer.classList.remove('open');
    }
  });
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => doSearch(e.target.value), 500);
  });
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { clearTimeout(searchTimeout); doSearch(e.target.value); searchInput.blur(); }
    if (e.key === 'Escape') { searchContainer.classList.remove('open'); searchInput.value = ''; doSearch(''); searchInput.blur(); }
    // On TV, arrow keys exit the input and return to D-pad navigation
    if (document.body.classList.contains('tv-mode') && ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
      searchInput.blur();
    }
  });

  // Load more
  $('#loadMoreBtn').onclick = () => { state.explorePage++; loadExplore(); };

  // Player back
  $('#playerBack').onclick = () => {
    if (document.fullscreenElement || document.webkitFullscreenElement) toggleFullscreen();
    closePlayer();
  };

  // Logout
  $('#logoutBtn').onclick = logout;

  // Check auth
  const isAuth = await checkAuth();
  if (isAuth) showApp();
  else $('#authScreen').style.display = 'flex';
}

/* ============ ADMIN PANEL ============ */
async function loadAdminUsers() {
  try {
    const users = await api('/api/auth/admin/users');
    const container = $('#adminUserList');
    if (!users.length) { container.innerHTML = '<div class="empty-state"><p>No users found</p></div>'; return; }
    container.innerHTML = users.map(u => `
      <div class="admin-user-card">
        <div class="avatar-sm">${u.username.charAt(0).toUpperCase()}</div>
        <div class="admin-user-info">
          <div class="name">${esc(u.username)}</div>
          <div class="email">${esc(u.email)}</div>
          <div class="role"><span class="badge ${u.is_admin ? '' : 'user'}">${u.is_admin ? 'Admin' : 'User'}</span></div>
        </div>
        <div class="admin-user-actions">
          <button class="btn-icon" title="Edit" onclick="openEditUserModal(${u.id},'${esc(u.username)}','${esc(u.email)}')">✏</button>
          ${u.id !== currentUser.id ? `<button class="btn-icon" title="${u.is_admin ? 'Remove Admin' : 'Make Admin'}" onclick="${u.is_admin ? `removeAdmin(${u.id})` : `makeAdmin(${u.id})`}">${u.is_admin ? '⬇' : '⬆'}</button>` : ''}
          ${u.id !== currentUser.id ? `<button class="btn-icon danger" title="Delete" onclick="deleteUser(${u.id},'${esc(u.username)}')">✕</button>` : ''}
        </div>
      </div>
    `).join('');
  } catch { }
}

async function openAddUserModal() {
  $('#modalTitle').textContent = 'Add User';
  $('#editUserId').value = '';
  $('#modalUsername').value = '';
  $('#modalEmail').value = '';
  $('#modalPassword').value = '';
  $('#modalPassLabel').textContent = 'Password';
  $('#modalPassword').required = true;
  $('#modalError').textContent = '';
  $('#userModal').style.display = 'flex';
}

function openEditUserModal(id, username, email) {
  $('#modalTitle').textContent = 'Edit User';
  $('#editUserId').value = id;
  $('#modalUsername').value = username;
  $('#modalEmail').value = email;
  $('#modalPassword').value = '';
  $('#modalPassLabel').textContent = 'New Password (leave blank to keep)';
  $('#modalPassword').required = false;
  $('#modalError').textContent = '';
  $('#userModal').style.display = 'flex';
}

async function saveUser() {
  const id = $('#editUserId').value;
  const username = $('#modalUsername').value.trim();
  const email = $('#modalEmail').value.trim();
  const password = $('#modalPassword').value;

  if (!username || !email) { $('#modalError').textContent = 'Username and email required'; return; }
  if (!id && !password) { $('#modalError').textContent = 'Password required'; return; }

  try {
    if (id) {
      const body = { username, email };
      if (password) body.password = password;
      await api(`/api/auth/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      await api('/api/auth/admin/users', { method: 'POST', body: JSON.stringify({ username, email, password }) });
    }
    $('#userModal').style.display = 'none';
    loadAdminUsers();
  } catch (e) {
    $('#modalError').textContent = e.message || 'Failed';
  }
}

async function makeAdmin(id) {
  await api(`/api/auth/admin/users/${id}/make-admin`, { method: 'POST' });
  loadAdminUsers();
}

async function removeAdmin(id) {
  await api(`/api/auth/admin/users/${id}/remove-admin`, { method: 'POST' });
  loadAdminUsers();
}

async function deleteUser(id, username) {
  if (!confirm(`Delete user "${username}"?`)) return;
  await api(`/api/auth/admin/users/${id}`, { method: 'DELETE' });
  loadAdminUsers();
}

/* ============ PROFILE ============ */
async function loadProfile() {
  try {
    const me = await api('/api/auth/me');
    currentUser = me;
    $('#profileAvatar').textContent = me.username.charAt(0).toUpperCase();
    $('#profileUsername').textContent = me.username;
    $('#profileEmail').textContent = me.email;
    $('#profileRole').textContent = me.is_admin ? 'Administrator' : 'Member';
    $('#profileSince').textContent = me.created_at ? new Date(me.created_at).toLocaleDateString() : '-';
    $('#changePassError').textContent = '';
  } catch { }
}

async function changeOwnPassword() {
  const current = $('#changePassCurrent').value;
  const np = $('#changePassNew').value;
  const errEl = $('#changePassError');
  errEl.textContent = '';

  if (!current || !np) { errEl.textContent = 'Both fields required'; return; }
  if (np.length < 6) { errEl.textContent = 'New password must be at least 6 characters'; return; }

  try {
    await api('/api/auth/profile/change-password', { method: 'POST', body: JSON.stringify({ current_password: current, new_password: np }) });
    errEl.style.color = 'var(--accent)';
    errEl.textContent = 'Password updated!';
    $('#changePassCurrent').value = '';
    $('#changePassNew').value = '';
    setTimeout(() => { errEl.textContent = ''; errEl.style.color = ''; }, 3000);
  } catch (e) {
    errEl.style.color = '';
    errEl.textContent = e.message || 'Failed';
  }
}

document.addEventListener('DOMContentLoaded', init);

/* ============ TV REMOTE / D-PAD NAVIGATION ============ */
(function() {
  var ua = navigator.userAgent || '';
  var isTV = /Android|SmartTV|GoogleTV|TiVo|CrKey|AFTM|AFTT|ADT|Nexus TV|webOS|NetCast/.test(ua)
    || (ua.indexOf('Android') !== -1 && ua.indexOf('Mobile') === -1)
    || window.location.search.indexOf('tv=1') !== -1;

  if (!isTV) return;

  document.body.classList.add('tv-mode');

  var FOCUS_SEL = 'a,button,[onclick],.card,.filter-chip,.explore-tab,.mylist-tab,.mobile-nav-item,.sidebar-action-btn,.section-link';
  var TOPBAR_SEL = '#searchToggle, #logoutBtn';
  var PLAYER_SEL = '#playerBack, #fullscreenBtn';

  function getAllFocusable() {
    var view = document.querySelector('.view.active');
    var viewEls = view ? Array.from(view.querySelectorAll(FOCUS_SEL)) : [];
    var topbarEls = Array.from(document.querySelectorAll(TOPBAR_SEL));
    var navEls = getNavItems();
    var seen = new Set();
    return topbarEls.concat(viewEls, navEls).filter(function(el) {
      if (seen.has(el)) return false;
      seen.add(el);
      var rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
  }

  function getPlayerFocusable() {
    return Array.from(document.querySelectorAll(PLAYER_SEL)).filter(function(el) {
      return el.getBoundingClientRect().width > 0;
    });
  }

  function getNavItems() {
    return Array.from(document.querySelectorAll('.mobile-nav-item')).filter(function(el) {
      return el.getBoundingClientRect().width > 0;
    });
  }

  function sameRow(a, b) {
    return Math.abs(a.getBoundingClientRect().top - b.getBoundingClientRect().top) < 80;
  }

  function focusEl(el) {
    if (!el) return;
    el.setAttribute('tabindex', '0');
    el.focus();
  }

  function getOpenMenu() {
    var m = document.querySelector('.filter-menu.open');
    return m;
  }

  function getMenuItems(menu) {
    return Array.from(menu.querySelectorAll('.filter-menu-item')).filter(function(el) {
      return el.getBoundingClientRect().height > 0;
    });
  }

  function initTvNav() {
    getNavItems().forEach(function(el) { el.setAttribute('tabindex', '0'); });
    var searchBtn = document.querySelector('#searchToggle');
    if (searchBtn) searchBtn.setAttribute('tabindex', '0');
  }

  function focusFirstTv() {
    var all = getAllFocusable();
    if (all.length) focusEl(all[0]);
  }

  function isPlayerActive() {
    return document.getElementById('playerOverlay').classList.contains('active');
  }

  function isSearchInputFocused() {
    return document.activeElement === document.getElementById('searchInput');
  }

  function closePlayerFromTv() {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      window.toggleFullscreen();
    }
    window.closePlayer();
  }

  document.addEventListener('keydown', function(e) {
    var f = document.activeElement;

    // Android back button (keycode 4) — close player or go back
    if (e.keyCode === 4) {
      if (isPlayerActive()) {
        closePlayerFromTv();
        e.preventDefault();
        return;
      }
      if (isSearchInputFocused()) {
        document.getElementById('searchInput').blur();
        document.getElementById('topbarSearch').classList.remove('open');
        e.preventDefault();
        return;
      }
    }

    // Skip D-pad handling if search input is focused — let the input handle its own keys
    if (isSearchInputFocused()) return;

    // Player overlay D-pad navigation
    if (isPlayerActive()) {
      var playerEls = getPlayerFocusable();
      var pi = playerEls.indexOf(f);

      switch (e.keyCode) {
        case 27: // ESC
        case 4:  // Android BACK
          closePlayerFromTv();
          e.preventDefault();
          return;
        case 37: // LEFT — focus player back button
          focusEl(playerEls[0]);
          e.preventDefault();
          return;
        case 39: // RIGHT — focus fullscreen button
          focusEl(playerEls[playerEls.length - 1]);
          e.preventDefault();
          return;
        case 38: // UP — stay on player controls
        case 40: // DOWN — stay on player controls
          e.preventDefault();
          return;
        case 13: // ENTER
        case 66: // D-pad center / OK
          if (pi >= 0) { f.click(); e.preventDefault(); return; }
          // No player button focused — focus back button and click it
          focusEl(playerEls[0]);
          e.preventDefault();
          return;
      }
      return; // Don't process any other keys while player is open
    }

    // Handle filter dropdown menu navigation when open
    var openMenu = getOpenMenu();
    if (openMenu && e.keyCode !== 27) {
      var menuItems = getMenuItems(openMenu);
      var mi = menuItems.indexOf(f);
      if (mi !== -1 || f.classList.contains('filter-chip')) {
        switch (e.keyCode) {
          case 38: // UP in menu
            if (mi > 0) { focusEl(menuItems[mi - 1]); e.preventDefault(); return; }
            e.preventDefault(); return;
          case 40: // DOWN in menu
            if (mi < menuItems.length - 1) { focusEl(menuItems[mi + 1]); e.preventDefault(); return; }
            e.preventDefault(); return;
          case 13: // ENTER selects
          case 66:
            if (mi >= 0) { f.click(); e.preventDefault(); return; }
            if (f.classList.contains('filter-chip') && menuItems.length) { focusEl(menuItems[0]); e.preventDefault(); return; }
            e.preventDefault(); return;
          case 27: // ESC closes menu
          case 4:  // BACK closes menu
            openMenu.classList.remove('open');
            e.preventDefault(); return;
          case 37: // LEFT closes menu and goes to prev chip
          case 39: // RIGHT closes menu and goes to next chip
            openMenu.classList.remove('open');
            break;
        }
      }
    }

    if (!f || f === document.body || f === document.documentElement) {
      initTvNav();
      focusFirstTv();
      return;
    }

    var all = getAllFocusable();
    var idx = all.indexOf(f);
    var isOnNav = f.classList.contains('mobile-nav-item');

    switch (e.keyCode) {
      case 27: // ESC
      case 4:  // Android BACK
        document.querySelectorAll('.filter-menu.open').forEach(function(m) { m.classList.remove('open'); });
        if (state.view !== 'home') { window.goBack(); }
        e.preventDefault();
        break;

      case 37: // LEFT
        if (isOnNav) {
          var navItems = getNavItems();
          var ni = navItems.indexOf(f);
          if (ni > 0) focusEl(navItems[ni - 1]);
        } else if (idx >= 0) {
          for (var i = idx - 1; i >= 0; i--) {
            if (sameRow(f, all[i])) { focusEl(all[i]); break; }
          }
        }
        e.preventDefault();
        break;

      case 39: // RIGHT
        if (isOnNav) {
          var navItems = getNavItems();
          var ni = navItems.indexOf(f);
          if (ni < navItems.length - 1) focusEl(navItems[ni + 1]);
        } else if (idx >= 0) {
          for (var i = idx + 1; i < all.length; i++) {
            if (sameRow(f, all[i])) { focusEl(all[i]); break; }
          }
        }
        e.preventDefault();
        break;

      case 38: // UP
        if (isOnNav) {
          var contentItems = all.filter(function(el) { return !el.classList.contains('mobile-nav-item'); });
          if (contentItems.length) focusEl(contentItems[contentItems.length - 1]);
          else {
            var topbarEls = Array.from(document.querySelectorAll(TOPBAR_SEL)).filter(function(el) { return el.getBoundingClientRect().width > 0; });
            if (topbarEls.length) focusEl(topbarEls[0]);
          }
        } else if (idx >= 0) {
          var curX = f.getBoundingClientRect().left + f.getBoundingClientRect().width / 2;
          var best = null, bestDist = Infinity;
          for (var i = idx - 1; i >= 0; i--) {
            if (sameRow(f, all[i])) continue;
            var r = all[i].getBoundingClientRect();
            var dist = Math.abs(r.left + r.width / 2 - curX) + Math.abs(r.top - f.getBoundingClientRect().top) * 0.3;
            if (dist < bestDist) { bestDist = dist; best = all[i]; }
            if (bestDist < 300) break;
          }
          if (best) {
            focusEl(best);
          } else {
            var topbarEls = Array.from(document.querySelectorAll(TOPBAR_SEL)).filter(function(el) { return el.getBoundingClientRect().width > 0; });
            if (topbarEls.length) focusEl(topbarEls[0]);
          }
        }
        e.preventDefault();
        break;

      case 40: // DOWN
        if (isOnNav) {
          // stay
        } else if (idx >= 0) {
          var curX = f.getBoundingClientRect().left + f.getBoundingClientRect().width / 2;
          var best = null, bestDist = Infinity;
          for (var i = idx + 1; i < all.length; i++) {
            if (sameRow(f, all[i])) continue;
            var r = all[i].getBoundingClientRect();
            var dist = Math.abs(r.left + r.width / 2 - curX) + Math.abs(r.top - f.getBoundingClientRect().top) * 0.3;
            if (dist < bestDist) { bestDist = dist; best = all[i]; }
            if (bestDist < 300) break;
          }
          if (best) {
            focusEl(best);
          } else {
            var navItems = getNavItems();
            if (navItems.length) {
              var activeNav = document.querySelector('.mobile-nav-item.active');
              focusEl(activeNav || navItems[0]);
            }
          }
        }
        e.preventDefault();
        break;

      case 13: // ENTER
      case 66: // D-pad center / OK
        f.click();
        e.preventDefault();
        break;
    }
  });

  // Re-init TV nav when view changes
  var origNav = window.navigate;
  if (typeof origNav === 'function') {
    window.navigate = function() {
      origNav.apply(this, arguments);
      setTimeout(initTvNav, 400);
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { setTimeout(function() { initTvNav(); focusFirstTv(); }, 800); });
  } else {
    setTimeout(function() { initTvNav(); focusFirstTv(); }, 800);
  }
})();
