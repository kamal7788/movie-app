import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/original';

const GENRES = [
  { id: '', name: 'All Genres' },
  { id: '28', name: 'Action' },
  { id: '12', name: 'Adventure' },
  { id: '16', name: 'Animation' },
  { id: '35', name: 'Comedy' },
  { id: '80', name: 'Crime' },
  { id: '99', name: 'Documentary' },
  { id: '18', name: 'Drama' },
  { id: '10751', name: 'Family' },
  { id: '14', name: 'Fantasy' },
  { id: '27', name: 'Horror' },
  { id: '9648', name: 'Mystery' },
  { id: '10749', name: 'Romance' },
  { id: '878', name: 'Sci-Fi' },
  { id: '53', name: 'Thriller' },
  { id: '10752', name: 'War' }
];

const SOURCES = [
  { id: '', name: 'All Sources' },
  { id: 'netflix', name: 'Netflix' },
  { id: 'disney+', name: 'Disney+' },
  { id: 'hbo', name: 'HBO' },
  { id: 'hulu', name: 'Hulu' },
  { id: 'amazon', name: 'Prime Video' },
  { id: 'apple-tv', name: 'Apple TV+' }
];

export default function Home() {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hero, setHero] = useState(null);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [genre, setGenre] = useState('');
  const [source, setSource] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { logout } = useAuth();
  const { currentProfile } = useProfile();
  const navigate = useNavigate();

  useEffect(() => {
    loadContent();
  }, [genre, source]);

  const loadContent = async () => {
    setLoading(true);
    try {
      let url = '/api/trending';
      if (genre || source) {
        url = `/api/discover?sort_by=popularity.desc${genre ? `&genre=${genre}` : ''}${source ? `&source=${source}` : ''}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.results) {
        const filtered = data.results.filter(r => (r.media_type === 'movie' || r.media_type === 'tv') && r.poster_path);
        setContent(filtered);
        if (filtered.length > 0 && !hero) {
          setHero(filtered[0]);
        }
      }
    } catch (err) {
      console.error('Error loading content:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleMediaClick = (media) => {
    const type = media.media_type === 'tv' ? 'tv' : 'movie';
    navigate(`/watch/${type}/${media.id}`);
  };

  return (
    <div>
      <header>
        <div className="container">
          <div className="header-content">
            <Link to="/" className="logo">STREAM<span>FLIX</span></Link>
            <nav className="nav-links">
              <Link to="/">Home</Link>
              <Link to="/search">Search</Link>
            </nav>
            {currentProfile && (
              <div className="profile-menu">
                <button className="profile-btn" style={{ background: currentProfile.color }}>
                  {currentProfile.avatar}
                </button>
                <div className="profile-dropdown">
                  <button onClick={() => navigate('/profiles')}>Switch Profile</button>
                  <button onClick={logout}>Sign Out</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {hero && (
        <section className="hero">
          <div className="hero-backdrop" style={{ backgroundImage: `url(${TMDB_BACKDROP_BASE}${hero.backdrop_path})` }}></div>
          <div className="container hero-content">
            <h1 className="hero-title">{hero.title || hero.name}</h1>
            <div className="hero-meta">
              <span>{hero.media_type === 'tv' ? 'TV Series' : 'Movie'}</span>
              <span>{(hero.release_date || hero.first_air_date || '').split('-')[0]}</span>
              <span className="rating">★ {hero.vote_average?.toFixed(1)}</span>
            </div>
            <button className="btn" style={{ marginTop: '1rem', maxWidth: '200px' }} onClick={() => handleMediaClick(hero)}>
              ▶ Play
            </button>
          </div>
        </section>
      )}

      <main className="container">
        <div className="filter-bar">
          <form onSubmit={handleSearch} className="search-container">
            <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input type="text" className="search-input" placeholder="Search movies, TV shows..." 
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </form>
          <select value={genre} onChange={(e) => setGenre(e.target.value)}>
            {GENRES.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            {SOURCES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <section className="section">
          <h2 className="section-title">
            {genre ? GENRES.find(g => g.id === genre)?.name : 'Trending'}
            {source ? ` on ${SOURCES.find(s => s.id === source)?.name}` : ''}
          </h2>
          {loading ? (
            <div className="empty-state"><div className="spinner"></div></div>
          ) : (
            <div className="grid">
              {content.map(media => (
                <div key={media.id} className="card" onClick={() => handleMediaClick(media)}>
                  <img className="card-poster" src={`${TMDB_IMAGE_BASE}${media.poster_path}`} alt={media.title || media.name} loading="lazy" />
                  <div className="card-overlay"></div>
                  <span className="card-badge">★ {media.vote_average?.toFixed(1)}</span>
                  <span className="card-type">{media.media_type === 'tv' ? 'TV' : 'Movie'}</span>
                  <div className="card-info">
                    <div className="card-title">{media.title || media.name}</div>
                    <div className="card-year">{(media.release_date || media.first_air_date || '').split('-')[0]}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <footer>
        <div className="container">
          <p>StreamFlix Pro</p>
        </div>
      </footer>
    </div>
  );
}