import React, { useState, useEffect, useCallback } from 'react';
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

export default function Home() {
  const [movies, setMovies] = useState([]);
  const [tvShows, setTvShows] = useState([]);
  const [hero, setHero] = useState(null);
  const [genre, setGenre] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const { logout, user } = useAuth();
  const { currentProfile } = useProfile();
  const navigate = useNavigate();

  const loadContent = useCallback(async () => {
    setLoading(true);
    try {
      const [moviesRes, tvRes] = await Promise.all([
        fetch('/api/trending/movies'),
        fetch('/api/trending/tv')
      ]);
      const moviesData = await moviesRes.json();
      const tvData = await tvRes.json();
      
      setMovies(moviesData.results || []);
      setTvShows(tvData.results || []);
      
      const allContent = [...(moviesData.results || []), ...(tvData.results || [])];
      if (allContent.length > 0 && !hero) {
        const randomIndex = Math.floor(Math.random() * Math.min(allContent.length, 10));
        setHero(allContent[randomIndex]);
      }
    } catch (err) {
      console.error('Error loading content:', err);
    } finally {
      setLoading(false);
    }
  }, [hero]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleMediaClick = (media) => {
    const type = media.title ? 'movie' : 'tv';
    navigate(`/watch/${type}/${media.id}`);
  };

  const handleGenreFilter = async (genreId) => {
    setGenre(genreId);
    setLoading(true);
    try {
      if (filterType === 'movies' || filterType === 'all') {
        const res = await fetch(`/api/discover/movies?genre=${genreId}`);
        const data = await res.json();
        setMovies(data.results || []);
      }
      if (filterType === 'tv' || filterType === 'all') {
        const res = await fetch(`/api/discover/tv?genre=${genreId}`);
        const data = await res.json();
        setTvShows(data.results || []);
      }
    } catch (err) {
      console.error('Error filtering:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredMovies = movies.filter(m => m.poster_path);
  const filteredTvShows = tvShows.filter(t => t.poster_path);

  return (
    <div>
      <header>
        <div className="container">
          <div className="header-content">
            <Link to="/" className="logo">STREAM<span>FLIX</span></Link>
            <form onSubmit={handleSearch} className="search-container" style={{ maxWidth: '280px' }}>
              <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input type="text" className="search-input" placeholder="Search..." 
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} tabIndex={0} />
            </form>
            <nav className="nav-links">
              <Link to="/">Home</Link>
              <Link to="/search">Search</Link>
              {user?.is_admin && <Link to="/admin">Admin</Link>}
            </nav>
            {currentProfile && (
              <div className="profile-menu">
                <button className="profile-btn" style={{ background: currentProfile.color }} tabIndex={0}>
                  {currentProfile.avatar}
                </button>
                <div className="profile-dropdown">
                  <button onClick={() => navigate('/profiles')} tabIndex={0}>Switch Profile</button>
                  <button onClick={() => navigate('/settings')} tabIndex={0}>Settings</button>
                  <button onClick={logout} tabIndex={0}>Sign Out</button>
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
              <span>{hero.name ? 'TV Series' : 'Movie'}</span>
              <span>{(hero.release_date || hero.first_air_date || '').split('-')[0]}</span>
              <span className="rating">★ {hero.vote_average?.toFixed(1)}</span>
            </div>
            <button className="btn" style={{ marginTop: '1rem', maxWidth: '200px' }} onClick={() => handleMediaClick(hero)} tabIndex={0}>
              ▶ Play
            </button>
          </div>
        </section>
      )}

      <main className="container">
        <div className="filter-bar">
          <select value={genre} onChange={(e) => handleGenreFilter(e.target.value)}>
            {GENRES.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="all">All</option>
            <option value="movies">Movies</option>
            <option value="tv">TV</option>
          </select>
        </div>

        {loading ? (
          <div className="empty-state"><div className="spinner"></div></div>
        ) : (
          <>
            {(filterType === 'all' || filterType === 'movies') && filteredMovies.length > 0 && (
              <section className="section">
                <h2 className="section-title">Movies</h2>
                <div className="grid">
                  {filteredMovies.slice(0, 20).map(media => (
                    <div key={`movie-${media.id}`} className="card" onClick={() => handleMediaClick(media)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleMediaClick(media); }} tabIndex={0} role="button" aria-label={media.title}>
                      <img className="card-poster" src={`${TMDB_IMAGE_BASE}${media.poster_path}`} alt={media.title} loading="lazy" />
                      <div className="card-overlay"></div>
                      <span className="card-badge">★ {media.vote_average?.toFixed(1)}</span>
                      <span className="card-type">Movie</span>
                      <div className="card-info">
                        <div className="card-title">{media.title}</div>
                        <div className="card-year">{(media.release_date || '').split('-')[0]}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(filterType === 'all' || filterType === 'tv') && filteredTvShows.length > 0 && (
              <section className="section">
                <h2 className="section-title">TV Shows</h2>
                <div className="grid">
                  {filteredTvShows.slice(0, 20).map(media => (
                    <div key={`tv-${media.id}`} className="card" onClick={() => handleMediaClick(media)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleMediaClick(media); }} tabIndex={0} role="button" aria-label={media.name}>
                      <img className="card-poster" src={`${TMDB_IMAGE_BASE}${media.poster_path}`} alt={media.name} loading="lazy" />
                      <div className="card-overlay"></div>
                      <span className="card-badge">★ {media.vote_average?.toFixed(1)}</span>
                      <span className="card-type">TV</span>
                      <div className="card-info">
                        <div className="card-title">{media.name}</div>
                        <div className="card-year">{(media.first_air_date || '').split('-')[0]}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <footer>
        <div className="container">
          <p>StreamFlix Pro</p>
        </div>
      </footer>
    </div>
  );
}