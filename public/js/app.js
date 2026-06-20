/* ============================================
   StreamFlix v2 - Full Frontend
   ============================================ */

const API = '';  // same origin
const VIDSRC_EMBED = 'https://vidsrc.to/embed';
const TMDB_IMG = 'https://image.tmdb.org/t/p';

const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];

/* ============================================
   State
   ============================================ */
let token = localStorage.getItem('sf_token');
let currentUser = null;
let state = {
  view: 'home',
  history: [],
  browseType: 'movie',
  browsePage: 1,
  filters: {},
  mylistTab: 'favorites',
  detailData: null,
  currentSeason: 1,
  focusIndex: -1,
  providers: [],
  genres: [],
};

/* ============================================
   API Helpers
   ============================================ */
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
  const url = new URL(`${API}/api/tmdb${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'all') url.searchParams.set(k, v);
  });
  return api(url.pathname + url.search);
}

function imgURL(path, size = 'w500') {
  if (!path) return '';
  return `${TMDB_IMG}/${size}${path}`;
}

/* ============================================
   Auth
   ============================================ */
async function login(email, password) {
  const data = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  token = data.token;
  currentUser = data.user;
  localStorage.setItem('sf_token', token);
  showApp();
}

async function register(username, email, password) {
  const data = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
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
  try {
    currentUser = await api('/api/auth/profile');
    return true;
  } catch {
    logout();
    return false;
  }
}

function showApp() {
  $('#authScreen').style.display = 'none';
  $('#app').style.display = 'block';
  if (currentUser) {
    $('#userAvatarBtn').textContent = currentUser.username.charAt(0).toUpperCase();
  }
  loadHome();
}

/* ============================================
   Navigation
   ============================================ */
function navigate(viewName, pushHistory = true) {
  if (pushHistory && state.view !== viewName) state.history.push(state.view);
  state.view = viewName;
  state.focusIndex = -1;
  $$('.view').forEach(v => v.classList.remove('active'));
  $(`#${viewName}View`).classList.add('active');

  const backBtn = $('#backBtn');
  const navTabs = $$('.nav-tab');

  if (viewName === 'player') {
    backBtn.style.display = 'flex';
    navTabs.forEach(t => t.style.display = 'none');
  } else {
    backBtn.style.display = state.history.length > 0 ? 'flex' : 'none';
    navTabs.forEach(t => t.style.display = '');
  }
  navTabs.forEach(t => t.classList.toggle('active', t.dataset.view === viewName));

  const el = $(`#${viewName}View`);
  if (el) el.scrollTop = 0;
}

function goBack() {
  if (state.history.length > 0) {
    const prev = state.history.pop();
    state.view = prev;
    $$('.view').forEach(v => v.classList.remove('active'));
    $(`#${prev}View`).classList.add('active');
    $('#backBtn').style.display = state.history.length > 0 ? 'flex' : 'none';
    $$('.nav-tab').forEach(t => t.style.display = '');
  } else {
    navigate('home', false);
  }
}

/* ============================================
   Home
   ============================================ */
async function loadHome() {
  try {
    const [trendingMovie, trendingTV] = await Promise.all([
      tmdb('/trending/movie/week'),
      tmdb('/trending/tv/week'),
    ]);

    // Hero
    const items = (trendingMovie.results || []).filter(i => i.backdrop_path && i.overview);
    if (items.length) {
      const item = items[Math.floor(Math.random() * Math.min(5, items.length))];
      const year = (item.release_date || '').slice(0, 4);
      $('#hero').style.backgroundImage = `url(${imgURL(item.backdrop_path, 'original')})`;
      $('#hero').innerHTML = `
        <div class="hero-content fade-in">
          <div class="hero-tag">Movie</div>
          <h1 class="hero-title">${item.title}</h1>
          <div class="hero-meta">
            <span class="rating">★ ${item.vote_average?.toFixed(1) || 'N/A'}</span>
            <span class="dot"></span><span>${year}</span>
          </div>
          <p class="hero-desc">${item.overview}</p>
          <div class="hero-buttons">
            <button class="btn btn-play" onclick="playMovie(${item.id}, '${(item.title||'').replace(/'/g,"\\'")}')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg> Play
            </button>
            <button class="btn btn-info" onclick="showDetail('movie', ${item.id})">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg> More Info
            </button>
          </div>
        </div>
      `;
    }

    // Sections
    const container = $('#homeSections');
    container.innerHTML = '';

    const sections = [
      { title: 'Trending Movies', items: trendingMovie.results },
      { title: 'Trending TV Shows', items: trendingTV.results },
    ];

    for (const section of sections) {
      if (!section.items?.length) continue;
      const row = document.createElement('div');
      row.className = 'content-row fade-in';
      row.innerHTML = `
        <h3 class="row-title">${section.title}</h3>
        <div class="row-scroll">${section.items.filter(i => i.poster_path).map(i => cardHTML(i, i.media_type || (section.title.includes('TV') ? 'tv' : 'movie'))).join('')}</div>
      `;
      container.appendChild(row);
    }

    // Genre rows
    const genreSections = [
      { title: 'Action', id: 28, type: 'movie' },
      { title: 'Comedy', id: 35, type: 'movie' },
      { title: 'Drama', id: 18, type: 'movie' },
      { title: 'Sci-Fi', id: 878, type: 'movie' },
      { title: 'Horror', id: 27, type: 'movie' },
    ];

    const genreResults = await Promise.all(
      genreSections.map(g => tmdb(`/discover/${g.type}`, { with_genres: g.id, sort_by: 'popularity.desc', page: 1 }).catch(() => null))
    );

    genreResults.forEach((data, idx) => {
      if (!data?.results?.length) return;
      const g = genreSections[idx];
      const row = document.createElement('div');
      row.className = 'content-row fade-in';
      row.innerHTML = `
        <h3 class="row-title">${g.title} Movies</h3>
        <div class="row-scroll">${data.results.filter(i => i.poster_path).map(i => cardHTML(i, 'movie')).join('')}</div>
      `;
      container.appendChild(row);
    });
  } catch (e) {
    console.error('Home load failed:', e);
  }
}

function cardHTML(item, type) {
  const title = item.title || item.name || 'Untitled';
  const year = (item.release_date || item.first_air_date || '').slice(0, 4);
  const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
  return `
    <div class="card" tabindex="0" onclick="showDetail('${type}', ${item.id})">
      <img class="card-poster" src="${imgURL(item.poster_path, 'w342')}" alt="${title}" loading="lazy">
      <div class="card-info">
        <div class="card-title">${title}</div>
        <div class="card-meta">
          <span class="card-rating">★ ${rating}</span>
          <span>${year}</span>
        </div>
      </div>
    </div>
  `;
}

/* ============================================
   Browse with Filters
   ============================================ */
async function showBrowse(type) {
  state.browseType = type;
  state.browsePage = 1;
  state.filters = {};
  $('#browseGrid').innerHTML = '';
  navigate('browse');
  await loadFilters();
  await loadBrowsePage();
}

async function loadFilters() {
  const [genreData, providerData] = await Promise.all([
    tmdb(`/genre/${state.browseType}/list`),
    tmdb('/watch/providers/movie').catch(() => ({ results: [] })),
  ]);

  state.genres = genreData.genres || [];
  state.providers = (providerData.results || []).slice(0, 20);

  const filterRow = $('#filterRow');
  filterRow.innerHTML = '';

  // Genre filter
  filterRow.appendChild(createFilterDropdown('Genre', 'with_genres', state.genres.map(g => ({ value: g.id, label: g.name }))));

  // Year filter
  const years = [];
  for (let y = 2026; y >= 2000; y--) years.push({ value: y, label: y.toString() });
  filterRow.appendChild(createFilterDropdown('Year', state.browseType === 'movie' ? 'primary_release_year' : 'first_air_date_year', years));

  // Sort
  filterRow.appendChild(createFilterDropdown('Sort By', 'sort_by', [
    { value: 'popularity.desc', label: 'Popular' },
    { value: 'vote_average.desc', label: 'Top Rated' },
    { value: 'primary_release_date.desc', label: 'Newest' },
    { value: 'revenue.desc', label: 'Revenue' },
  ]));

  // Streaming service
  if (state.providers.length) {
    filterRow.appendChild(createFilterDropdown('Streaming On', 'with_watch_providers', state.providers.map(p => ({
      value: p.provider_id,
      label: p.provider_name,
    }))));
  }

  // Rating filter
  filterRow.appendChild(createFilterDropdown('Min Rating', 'vote_average.gte', [
    { value: '', label: 'Any' },
    { value: '7', label: '7+' },
    { value: '8', label: '8+' },
    { value: '9', label: '9+' },
  ]));
}

function createFilterDropdown(label, param, options) {
  const group = document.createElement('div');
  group.className = 'filter-group';

  const btn = document.createElement('button');
  btn.className = 'filter-btn';
  btn.innerHTML = `${label} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>`;

  const dropdown = document.createElement('div');
  dropdown.className = 'filter-dropdown';

  const clearItem = document.createElement('div');
  clearItem.className = 'filter-option';
  clearItem.textContent = `All ${label}`;
  clearItem.onclick = (e) => {
    e.stopPropagation();
    delete state.filters[param];
    btn.classList.remove('active');
    btn.innerHTML = `${label} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>`;
    dropdown.querySelectorAll('.filter-option').forEach(o => o.classList.remove('selected'));
    dropdown.classList.remove('open');
    refreshBrowse();
  };
  dropdown.appendChild(clearItem);

  options.forEach(opt => {
    const item = document.createElement('div');
    item.className = 'filter-option';
    item.textContent = opt.label;
    item.onclick = (e) => {
      e.stopPropagation();
      state.filters[param] = opt.value;
      btn.classList.add('active');
      btn.innerHTML = `${opt.label} <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>`;
      dropdown.querySelectorAll('.filter-option').forEach(o => o.classList.remove('selected'));
      item.classList.add('selected');
      dropdown.classList.remove('open');
      refreshBrowse();
    };
    dropdown.appendChild(item);
  });

  btn.onclick = (e) => {
    e.stopPropagation();
    $$('.filter-dropdown').forEach(d => { if (d !== dropdown) d.classList.remove('open'); });
    dropdown.classList.toggle('open');
  };

  group.appendChild(btn);
  group.appendChild(dropdown);
  return group;
}

document.addEventListener('click', () => $$('.filter-dropdown').forEach(d => d.classList.remove('open')));

async function loadBrowsePage() {
  const grid = $('#browseGrid');
  try {
    const params = { ...state.filters, page: state.browsePage, watch_region: 'US' };
    if (state.browseType === 'tv' && params.sort_by) {
      params.sort_by = params.sort_by.replace('primary_release_date', 'first_air_date');
    }
    const data = await tmdb(`/discover/${state.browseType}`, params);
    if (state.browsePage === 1) grid.innerHTML = '';
    (data.results || []).filter(i => i.poster_path).forEach(i => {
      const card = document.createElement('div');
      card.className = 'card fade-in';
      card.tabIndex = 0;
      card.onclick = () => showDetail(state.browseType, i.id);
      card.innerHTML = `
        <img class="card-poster" src="${imgURL(i.poster_path, 'w342')}" alt="${i.title || i.name}" loading="lazy">
        <div class="card-info">
          <div class="card-title">${i.title || i.name}</div>
          <div class="card-meta">
            <span class="card-rating">★ ${i.vote_average?.toFixed(1) || 'N/A'}</span>
            <span>${(i.release_date || i.first_air_date || '').slice(0, 4)}</span>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });
    $('#loadMore').style.display = data.results?.length ? 'block' : 'none';
  } catch (e) {
    console.error('Browse failed:', e);
  }
}

function refreshBrowse() {
  state.browsePage = 1;
  loadBrowsePage();
}

/* ============================================
   Search
   ============================================ */
async function doSearch(query) {
  if (!query.trim()) return;
  const grid = $('#searchGrid');
  grid.innerHTML = '<div class="spinner" style="margin:40px auto"></div>';
  navigate('search');
  $('#searchTitle').textContent = `Results for "${query}"`;

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
          <img class="card-poster" src="${imgURL(i.poster_path, 'w342')}" alt="${i.title || i.name}" loading="lazy">
          <div class="card-info">
            <div class="card-title">${i.title || i.name}</div>
            <div class="card-meta">
              <span class="card-rating">★ ${i.vote_average?.toFixed(1) || 'N/A'}</span>
              <span>${i.media_type === 'tv' ? 'TV' : 'Movie'}</span>
            </div>
          </div>
        `;
        grid.appendChild(card);
      });
    if (!grid.children.length) {
      grid.innerHTML = '<p style="text-align:center;color:var(--muted);padding:40px;grid-column:1/-1">No results found</p>';
    }
  } catch (e) {
    grid.innerHTML = '<p style="text-align:center;color:var(--muted);padding:40px;grid-column:1/-1">Search failed</p>';
  }
}

/* ============================================
   My List
   ============================================ */
async function loadMyList(tab) {
  state.mylistTab = tab || 'favorites';
  $$('.mylist-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === state.mylistTab));
  const grid = $('#mylistGrid');
  grid.innerHTML = '<div class="spinner" style="margin:40px auto"></div>';

  try {
    let items = [];
    if (state.mylistTab === 'favorites') {
      items = await api('/api/auth/favorites');
    } else if (state.mylistTab === 'watchlist') {
      items = await api('/api/auth/watchlist');
    } else {
      items = await api('/api/auth/history');
    }

    grid.innerHTML = '';
    if (!items.length) {
      grid.innerHTML = '<p style="text-align:center;color:var(--muted);padding:40px;grid-column:1/-1">Nothing here yet</p>';
      return;
    }

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card fade-in';
      card.tabIndex = 0;
      card.onclick = () => showDetail(item.media_type, item.tmdb_id);

      const posterURL = item.poster_path
        ? (item.poster_path.startsWith('http') ? item.poster_path : imgURL(item.poster_path, 'w342'))
        : '';

      let progressHTML = '';
      if (state.mylistTab === 'continue' && item.duration_seconds > 0) {
        const pct = Math.round((item.progress_seconds / item.duration_seconds) * 100);
        progressHTML = `<div class="episode-progress"><div class="episode-progress-bar" style="width:${pct}%"></div></div>`;
      }

      card.innerHTML = `
        <img class="card-poster" src="${posterURL}" alt="${item.title || ''}" loading="lazy">
        <div class="card-info">
          <div class="card-title">${item.title || 'Untitled'}</div>
          ${progressHTML}
        </div>
      `;
      grid.appendChild(card);
    });
  } catch (e) {
    grid.innerHTML = '<p style="text-align:center;color:var(--muted);padding:40px;grid-column:1/-1">Failed to load</p>';
  }
}

/* ============================================
   Favorites / Watchlist helpers
   ============================================ */
async function toggleFavorite(tmdbId, mediaType, title, posterPath) {
  try {
    const existing = await api('/api/auth/favorites');
    const isFav = existing.some(f => f.tmdb_id === tmdbId && f.media_type === mediaType);
    if (isFav) {
      await api(`/api/auth/favorites/${tmdbId}/${mediaType}`, { method: 'DELETE' });
    } else {
      await api('/api/auth/favorites', {
        method: 'POST',
        body: JSON.stringify({ tmdb_id: tmdbId, media_type: mediaType, title, poster_path: posterPath }),
      });
    }
    return !isFav;
  } catch (e) {
    console.error('Toggle favorite failed:', e);
    return null;
  }
}

async function toggleWatchlist(tmdbId, mediaType, title, posterPath) {
  try {
    const existing = await api('/api/auth/watchlist');
    const inList = existing.some(w => w.tmdb_id === tmdbId && w.media_type === mediaType);
    if (inList) {
      await api(`/api/auth/watchlist/${tmdbId}/${mediaType}`, { method: 'DELETE' });
    } else {
      await api('/api/auth/watchlist', {
        method: 'POST',
        body: JSON.stringify({ tmdb_id: tmdbId, media_type: mediaType, title, poster_path: posterPath }),
      });
    }
    return !inList;
  } catch (e) {
    console.error('Toggle watchlist failed:', e);
    return null;
  }
}

async function checkFavorite(tmdbId, mediaType) {
  try {
    const existing = await api('/api/auth/favorites');
    return existing.some(f => f.tmdb_id === tmdbId && f.media_type === mediaType);
  } catch { return false; }
}

async function checkWatchlist(tmdbId, mediaType) {
  try {
    const existing = await api('/api/auth/watchlist');
    return existing.some(w => w.tmdb_id === tmdbId && w.media_type === mediaType);
  } catch { return false; }
}

/* ============================================
   Detail
   ============================================ */
async function showDetail(type, id) {
  navigate('detail');
  const heroEl = $('#detailHero');
  const infoEl = $('#detailInfo');
  const seasonsEl = $('#detailSeasons');
  heroEl.innerHTML = '<div class="spinner" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)"></div>';
  infoEl.innerHTML = '';
  seasonsEl.style.display = 'none';

  try {
    const data = await tmdb(`/${type}/${id}`, { append_to_response: 'credits,external_ids' });
    state.detailData = { ...data, media_type: type };
    const year = (data.release_date || data.first_air_date || '').slice(0, 4);
    const rating = data.vote_average ? data.vote_average.toFixed(1) : 'N/A';
    const runtime = data.runtime ? `${Math.floor(data.runtime / 60)}h ${data.runtime % 60}m` : '';

    heroEl.style.backgroundImage = `url(${imgURL(data.backdrop_path, 'original')})`;

    const isFav = await checkFavorite(id, type);
    const inWatchlist = await checkWatchlist(id, type);

    heroEl.innerHTML = `
      <div class="detail-hero-content fade-in">
        <h1>${data.title || data.name}</h1>
        <div class="detail-meta">
          <span class="rating">★ ${rating}</span>
          <span>${year}</span>
          ${runtime ? `<span>${runtime}</span>` : ''}
          ${data.number_of_seasons ? `<span>${data.number_of_seasons} Season${data.number_of_seasons > 1 ? 's' : ''}</span>` : ''}
        </div>
        ${data.tagline ? `<p style="font-style:italic;color:var(--text2);margin-bottom:8px">"${data.tagline}"</p>` : ''}
        <p class="detail-overview">${data.overview || 'No description available.'}</p>
        <div class="detail-actions">
          <button class="btn btn-play" onclick="playFromDetail()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg> Play
          </button>
          <button class="btn btn-fav ${isFav ? 'active' : ''}" id="favBtn" onclick="handleFav()">
            ${isFav ? '&#10084; Favorited' : '&#9825; Favorite'}
          </button>
          <button class="btn btn-fav ${inWatchlist ? 'active' : ''}" id="watchlistBtn" onclick="handleWatchlist()">
            ${inWatchlist ? '&#10003; In Watchlist' : '+ Watchlist'}
          </button>
        </div>
      </div>
    `;

    const genres = (data.genres || []).map(g => `<span>${g.name}</span>`).join('');
    const directors = (data.credits?.crew || []).filter(c => c.job === 'Director').map(c => c.name).join(', ');
    const cast = (data.credits?.cast || []).slice(0, 8).map(c => c.name).join(', ');

    infoEl.innerHTML = `
      <div class="fade-in">
        ${directors ? `<div class="info-label">Director</div><div class="info-value">${directors}</div>` : ''}
        ${cast ? `<div class="info-label">Cast</div><div class="info-value">${cast}</div>` : ''}
        ${genres ? `<div class="info-label">Genres</div><div class="info-value">${genres}</div>` : ''}
      </div>
      <div class="fade-in">
        ${data.original_language ? `<div class="info-label">Language</div><div class="info-value">${data.original_language.toUpperCase()}</div>` : ''}
        ${data.status ? `<div class="info-label">Status</div><div class="info-value">${data.status}</div>` : ''}
        ${data.number_of_episodes ? `<div class="info-label">Episodes</div><div class="info-value">${data.number_of_episodes}</div>` : ''}
      </div>
    `;

    if (type === 'tv' && data.seasons) {
      seasonsEl.style.display = 'block';
      state.currentSeason = 1;
      renderSeasonSelector(data.seasons, id);
      await loadEpisodes(id, 1);
    }
  } catch (e) {
    heroEl.innerHTML = '<p style="text-align:center;padding:40px;color:var(--muted)">Failed to load details</p>';
  }
}

window.handleFav = async function() {
  if (!state.detailData) return;
  const d = state.detailData;
  const result = await toggleFavorite(d.id, d.media_type, d.title || d.name, d.poster_path);
  if (result !== null) {
    const btn = $('#favBtn');
    btn.className = `btn btn-fav ${result ? 'active' : ''}`;
    btn.innerHTML = result ? '&#10084; Favorited' : '&#9825; Favorite';
  }
};

window.handleWatchlist = async function() {
  if (!state.detailData) return;
  const d = state.detailData;
  const result = await toggleWatchlist(d.id, d.media_type, d.title || d.name, d.poster_path);
  if (result !== null) {
    const btn = $('#watchlistBtn');
    btn.className = `btn btn-fav ${result ? 'active' : ''}`;
    btn.innerHTML = result ? '&#10003; In Watchlist' : '+ Watchlist';
  }
};

function renderSeasonSelector(seasons, tvId) {
  const el = $('#detailSeasons');
  el.innerHTML = `
    <div class="season-selector" id="seasonSelector"></div>
    <div class="episodes-list" id="episodesList"></div>
  `;
  const selector = $('#seasonSelector');
  seasons.filter(s => s.season_number > 0).forEach(s => {
    const btn = document.createElement('button');
    btn.className = `season-btn${s.season_number === 1 ? ' active' : ''}`;
    btn.textContent = `Season ${s.season_number}`;
    btn.onclick = () => {
      state.currentSeason = s.season_number;
      $$('.season-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadEpisodes(tvId, s.season_number);
    };
    selector.appendChild(btn);
  });
}

async function loadEpisodes(tvId, season) {
  const list = $('#episodesList');
  list.innerHTML = '<div class="spinner" style="margin:20px auto"></div>';
  try {
    const data = await tmdb(`/tv/${tvId}/season/${season}`);
    const history = token ? await api('/api/auth/history').catch(() => []) : [];

    list.innerHTML = '';
    (data.episodes || []).forEach(ep => {
      const hist = history.find(h => h.tmdb_id === tvId && h.season === season && h.episode === ep.episode_number);
      let progressHTML = '';
      if (hist && hist.duration_seconds > 0) {
        const pct = Math.round((hist.progress_seconds / hist.duration_seconds) * 100);
        progressHTML = `<div class="episode-progress"><div class="episode-progress-bar" style="width:${pct}%"></div></div>`;
      }

      const card = document.createElement('div');
      card.className = 'episode-card fade-in';
      card.tabIndex = 0;
      card.onclick = () => playEpisode(tvId, season, ep.episode_number, state.detailData?.name);
      card.innerHTML = `
        ${ep.still_path ? `<img class="episode-thumb" src="${imgURL(ep.still_path, 'w300')}" loading="lazy">` : '<div class="episode-thumb"></div>'}
        <div class="episode-info">
          <div class="episode-number">E${ep.episode_number} ${ep.air_date ? '&middot; ' + ep.air_date : ''}</div>
          <div class="episode-title">${ep.name}</div>
          <div class="episode-desc">${(ep.overview || '').replace(/<[^>]*>/g, '').slice(0, 150)}</div>
          ${progressHTML}
        </div>
        <button class="episode-play" aria-label="Play">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
        </button>
      `;
      list.appendChild(card);
    });
  } catch (e) {
    list.innerHTML = '<p style="text-align:center;color:var(--muted);padding:20px">Failed to load episodes</p>';
  }
}

/* ============================================
   Player
   ============================================ */
function playMovie(tmdbId, title) {
  const embedUrl = `${VIDSRC_EMBED}/movie/tmdb-${tmdbId}`;
  openPlayer(embedUrl, title, tmdbId, 'movie');
}

function playEpisode(tvId, season, episode, showName) {
  const embedUrl = `${VIDSRC_EMBED}/tv/tmdb-${tvId}/${season}/${episode}`;
  openPlayer(embedUrl, `${showName || 'TV'} - S${season}E${episode}`, tvId, 'tv', season, episode);
}

async function playFromDetail() {
  if (!state.detailData) return;
  const d = state.detailData;
  if (d.media_type === 'movie') {
    playMovie(d.id, d.title || d.name);
  } else {
    playEpisode(d.id, 1, 1, d.name);
  }
}

function openPlayer(url, title, tmdbId, mediaType, season, episode) {
  navigate('player', true);
  $('#playerTitle').textContent = title || '';
  const frame = $('#playerFrame');
  frame.src = url;

  // Block popups
  window.open = () => null;
  document.addEventListener('click', (e) => {
    if (e.target.closest('.player-wrapper') && e.target.closest('a[target="_blank"]')) {
      e.preventDefault();
    }
  }, true);

  $('#playerControls').innerHTML = `
    <span>Space=play/pause, ←→=seek, ↑↓=volume, F=fullscreen, M=mute</span>
    <span>Press Esc to exit</span>
  `;

  // Track progress every 30 seconds
  if (token && tmdbId) {
    const interval = setInterval(() => {
      try {
        const vid = frame.contentWindow?.document?.querySelector('video');
        if (vid) {
          api('/api/auth/history', {
            method: 'POST',
            body: JSON.stringify({
              tmdb_id: tmdbId,
              media_type: mediaType || 'movie',
              title,
              poster_path: state.detailData?.poster_path,
              backdrop_path: state.detailData?.backdrop_path,
              season: season || 1,
              episode: episode || 1,
              progress_seconds: Math.floor(vid.currentTime),
              duration_seconds: Math.floor(vid.duration || 0),
            }),
          }).catch(() => {});
        }
      } catch {}
    }, 30000);

    // Clean up on navigate away
    const checkInterval = setInterval(() => {
      if (state.view !== 'player') {
        clearInterval(interval);
        clearInterval(checkInterval);
      }
    }, 1000);
  }
}

/* ============================================
   Keyboard & Remote
   ============================================ */
document.addEventListener('keydown', (e) => {
  if ($('#authScreen').style.display !== 'none') return;

  if (state.view === 'player') {
    handlePlayerKeys(e);
    return;
  }

  switch (e.key) {
    case 'Escape':
    case 'Backspace':
      if (state.view !== 'home') { e.preventDefault(); goBack(); }
      break;
    case 'ArrowLeft':
    case 'ArrowRight':
    case 'ArrowUp':
    case 'ArrowDown':
      e.preventDefault();
      handleNavigation(e.key);
      break;
    case 'Enter':
      e.preventDefault();
      const focused = document.activeElement;
      if (focused?.classList.contains('focused')) focused.click();
      break;
  }
});

function handleNavigation(key) {
  const viewEl = $(`#${state.view}View`);
  if (!viewEl) return;
  const focusable = $$(`#${state.view}View .card, #${state.view}View .btn, #${state.view}View .season-btn, #${state.view}View .episode-card, #${state.view}View .mylist-tab, #${state.view}View .filter-btn`, viewEl);
  if (!focusable.length) return;
  if (state.focusIndex < 0) state.focusIndex = 0;

  if (key === 'ArrowRight') state.focusIndex = Math.min(state.focusIndex + 1, focusable.length - 1);
  else if (key === 'ArrowLeft') state.focusIndex = Math.max(state.focusIndex - 1, 0);
  else if (key === 'ArrowDown') state.focusIndex = Math.min(state.focusIndex + 4, focusable.length - 1);
  else if (key === 'ArrowUp') state.focusIndex = Math.max(state.focusIndex - 4, 0);

  focusable.forEach((el, i) => {
    el.classList.toggle('focused', i === state.focusIndex);
    if (i === state.focusIndex) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  });
}

function handlePlayerKeys(e) {
  const frame = $('#playerFrame');
  switch (e.key) {
    case 'Escape':
    case 'Backspace':
      e.preventDefault();
      frame.src = '';
      goBack();
      break;
    case 'f':
    case 'F':
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen().catch(() => {});
      break;
  }
}

/* ============================================
   Init
   ============================================ */
async function init() {
  setTimeout(() => $('#loadingSpinner').classList.add('hidden'), 300);

  // Auth UI
  $('#showRegister').onclick = () => {
    $('#authLoginForm').style.display = 'none';
    $('#authRegisterForm').style.display = 'block';
  };
  $('#showLogin').onclick = () => {
    $('#authRegisterForm').style.display = 'none';
    $('#authLoginForm').style.display = 'block';
  };

  $('#loginBtn').onclick = async () => {
    const email = $('#loginEmail').value.trim();
    const password = $('#loginPassword').value;
    if (!email || !password) { $('#loginError').textContent = 'All fields required'; return; }
    $('#loginBtn').disabled = true;
    try {
      await login(email, password);
    } catch (e) {
      $('#loginError').textContent = e.message || 'Login failed';
    }
    $('#loginBtn').disabled = false;
  };

  $('#registerBtn').onclick = async () => {
    const username = $('#regUsername').value.trim();
    const email = $('#regEmail').value.trim();
    const password = $('#regPassword').value;
    if (!username || !email || !password) { $('#registerError').textContent = 'All fields required'; return; }
    if (password.length < 6) { $('#registerError').textContent = 'Password min 6 chars'; return; }
    $('#registerBtn').disabled = true;
    try {
      await register(username, email, password);
    } catch (e) {
      $('#registerError').textContent = e.message || 'Registration failed';
    }
    $('#registerBtn').disabled = false;
  };

  // Enter key on inputs
  ['#loginPassword', '#loginEmail'].forEach(sel => {
    $(sel)?.addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#loginBtn').click(); });
  });
  ['#regPassword', '#regEmail', '#regUsername'].forEach(sel => {
    $(sel)?.addEventListener('keydown', (e) => { if (e.key === 'Enter') $('#registerBtn').click(); });
  });

  // Nav
  $$('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const v = tab.dataset.view;
      if (v === 'home') navigate('home');
      else if (v === 'movies') showBrowse('movie');
      else if (v === 'series') showBrowse('tv');
      else if (v === 'mylist') { navigate('mylist'); loadMyList(); }
    });
  });

  $('#logoBtn').onclick = () => navigate('home');
  $('#backBtn').onclick = goBack;
  $('#playerBack').onclick = () => { $('#playerFrame').src = ''; goBack(); };

  // User menu
  $('#userAvatarBtn').onclick = () => $('#userDropdown').classList.toggle('open');
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) $('#userDropdown').classList.remove('open');
  });
  $('#logoutBtn').onclick = logout;

  // Search
  const searchBox = $('#searchBox');
  const searchInput = $('#searchInput');
  const searchBtn = $('#searchBtn');
  const searchClose = $('#searchClose');

  searchBtn.onclick = () => {
    if (searchBox.classList.contains('focused')) {
      doSearch(searchInput.value);
    } else {
      searchBox.classList.add('focused');
      searchInput.focus();
      searchBtn.style.display = 'none';
      searchClose.style.display = 'flex';
    }
  };
  searchClose.onclick = () => {
    searchBox.classList.remove('focused');
    searchInput.value = '';
    searchBtn.style.display = 'flex';
    searchClose.style.display = 'none';
  };
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch(searchInput.value);
    if (e.key === 'Escape') { searchBox.classList.remove('focused'); searchInput.value = ''; searchBtn.style.display = 'flex'; searchClose.style.display = 'none'; }
  });

  // Load more
  $('#loadMoreBtn').onclick = () => { state.browsePage++; loadBrowsePage(); };

  // My list tabs
  $$('.mylist-tab').forEach(tab => {
    tab.onclick = () => loadMyList(tab.dataset.tab);
  });

  // Scroll effect
  $('#homeView').addEventListener('scroll', () => {
    $('#navbar').classList.toggle('scrolled', $('#homeView').scrollTop > 50);
  });

  // Check auth
  const isAuth = await checkAuth();
  if (isAuth) {
    showApp();
  } else {
    $('#authScreen').style.display = 'flex';
  }
}

document.addEventListener('DOMContentLoaded', init);
