import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const navigate = useNavigate();

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      performSearch(q);
    }
  }, [searchParams]);

  const performSearch = async (q) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/search?query=${encodeURIComponent(q)}&include_adult=false`);
      const data = await res.json();
      if (data.results) {
        setResults(data.results.filter(r => (r.media_type === 'movie' || r.media_type === 'tv') && r.poster_path));
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query });
      performSearch(query);
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
          </div>
        </div>
      </header>

      <main className="container">
        <div className="filter-bar" style={{ paddingTop: '2rem' }}>
          <form onSubmit={handleSearch} className="search-container">
            <svg className="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input type="text" className="search-input" placeholder="Search movies, TV shows..." 
              value={query} onChange={(e) => setQuery(e.target.value)} />
          </form>
        </div>

        <section className="section">
          {query && <h2 className="section-title">Results for "{query}"</h2>}
          
          {loading ? (
            <div className="empty-state"><div className="spinner"></div></div>
          ) : results.length === 0 && query ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 8v4M12 16h.01"></path>
              </svg>
              <p>No results found</p>
            </div>
          ) : (
            <div className="grid">
              {results.map(media => (
                <div key={media.id} className="card" onClick={() => handleMediaClick(media)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleMediaClick(media); }} tabIndex={0} role="button" aria-label={media.title || media.name}>
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