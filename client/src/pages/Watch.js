import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactPlayer from 'react-player';
import { useProfile } from '../context/ProfileContext';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const FREE_STREAM_SOURCES = [
  { name: 'Vidsrc', baseUrl: 'https://vidsrc.vip/embed/' },
  { name: 'AutoEmbed', baseUrl: 'https://play.accord.space/embed/' },
  { name: 'PlayerHub', baseUrl: 'https://playerhub.me/embed/' }
];

export default function Watch() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const { currentProfile } = useProfile();
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [currentSource, setCurrentSource] = useState(0);
  const [videoUrl, setVideoUrl] = useState('');
  const [showSources, setShowSources] = useState(false);

  useEffect(() => {
    loadMedia();
    fetchWatchlist();
  }, [type, id]);

  const loadMedia = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/${type}/${id}`);
      const data = await res.json();
      setMedia(data);
    } catch (err) {
      console.error('Error loading media:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWatchlist = async () => {
    if (!currentProfile) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/watchlist?profileId=${currentProfile.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setInWatchlist(data.watchlist?.some(item => item.mediaId === id));
    } catch (err) {
      console.error('Error fetching watchlist:', err);
    }
  };

  const toggleWatchlist = async () => {
    const token = localStorage.getItem('token');
    if (!token || !currentProfile) return;

    if (inWatchlist) {
      await fetch(`/api/watchlist/${id}?profileId=${currentProfile.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setInWatchlist(false);
    } else {
      await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          profileId: currentProfile.id,
          mediaId: id,
          mediaType: type,
          title: media?.title || media?.name,
          poster: media?.poster_path ? `${TMDB_IMAGE_BASE}${media.poster_path}` : null
        })
      });
      setInWatchlist(true);
    }
  };

  const getVideoUrl = () => {
    const source = FREE_STREAM_SOURCES[currentSource];
    return `${source.baseUrl}${type}/${id}`;
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  return (
    <div className="watch-page">
      <div className="container">
        <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          ← Back to Home
        </Link>
        
        <div className="watch-container">
          <ReactPlayer
            url={getVideoUrl()}
            width="100%"
            height="100%"
            controls
            playing
            config={{
              file: {
                attributes: { controlsList: 'nodownload' }
              }
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
          <button 
            onClick={() => setShowSources(!showSources)}
            style={{ padding: '0.5rem 1rem', background: 'var(--surface)', border: '2px solid var(--border)', borderRadius: '8px', color: 'var(--text)', cursor: 'pointer' }}>
            Change Source ({FREE_STREAM_SOURCES[currentSource].name})
          </button>
          {inWatchlist ? (
            <button onClick={toggleWatchlist} style={{ padding: '0.5rem 1rem', background: 'var(--primary)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }}>
              ✓ In Watchlist
            </button>
          ) : (
            <button onClick={toggleWatchlist} style={{ padding: '0.5rem 1rem', background: 'var(--surface)', border: '2px solid var(--border)', borderRadius: '8px', color: 'var(--text)', cursor: 'pointer' }}>
              + Add to Watchlist
            </button>
          )}
        </div>

        {showSources && (
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {FREE_STREAM_SOURCES.map((source, idx) => (
              <button
                key={source.name}
                onClick={() => { setCurrentSource(idx); setShowSources(false); }}
                style={{
                  padding: '0.5rem 1rem',
                  background: idx === currentSource ? 'var(--primary)' : 'var(--surface)',
                  border: '2px solid var(--border)',
                  borderRadius: '8px',
                  color: 'white',
                  cursor: 'pointer'
                }}>
                {source.name}
              </button>
            ))}
          </div>
        )}

        {media && (
          <div className="watch-info">
            <h1>{media.title || media.name}</h1>
            <div className="modal-meta">
              <span>{(media.release_date || media.first_air_date || '').split('-')[0]}</span>
              <span className="rating">★ {media.vote_average?.toFixed(1)}</span>
              {media.runtime && <span>{Math.floor(media.runtime / 60)}h {media.runtime % 60}m</span>}
            </div>
            {media.genres && (
              <div className="modal-genres" style={{ marginTop: '1rem' }}>
                {media.genres.map(genre => (
                  <span key={genre.id} className="genre-tag">{genre.name}</span>
                ))}
              </div>
            )}
            {media.overview && (
              <p className="modal-overview">{media.overview}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}