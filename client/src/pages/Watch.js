import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const SOURCES = [
  { id: 'player.videasy.net', name: 'Server 1', url: (type, id) => `https://player.videasy.net/${type}/${id}` },
  { id: 'vidking', name: 'Server 2', url: (type, id) => `https://www.vidking.net/embed/${type}/${id}` },
];

export default function Watch() {
  const { type, id } = useParams();
  const { currentProfile } = useProfile();
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [currentSource, setCurrentSource] = useState(SOURCES[0]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const loadMedia = useCallback(async () => {
    try {
      const res = await fetch(`/api/${type}/${id}`);
      const data = await res.json();
      setMedia(data);
    } catch (err) {
      console.error('Error loading media:', err);
    } finally {
      setLoading(false);
    }
  }, [type, id]);

  const fetchWatchlist = useCallback(async () => {
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
  }, [currentProfile, id]);

  useEffect(() => {
    loadMedia();
    fetchWatchlist();
  }, [loadMedia, fetchWatchlist]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleFullscreen = async () => {
    const el = document.querySelector('.watch-container');
    if (!el) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await el.requestFullscreen();
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

  if (loading) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  return (
    <div className="watch-page">
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }} tabIndex={0}>
            ← Back to Home
          </Link>
          <div style={{ display: 'flex', gap: '0.4rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
            {SOURCES.map(source => (
              <button key={source.id} onClick={() => setCurrentSource(source)} style={{
                padding: '0.3rem 0.6rem',
                background: currentSource.id === source.id ? 'var(--primary)' : 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text)',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }} tabIndex={0}>{source.name}</button>
            ))}
          </div>
        </div>

        <div className="watch-container" style={{ position: 'relative', background: '#000' }}>
          <iframe
            id="video-frame"
            src={currentSource.url(type, id)}
            frameBorder="0"
            allowFullScreen
            allow="autoplay; fullscreen; encrypted-media"
            scrolling="no"
            title="Video Player"
            style={{ width: '100%', height: '100%', border: 'none', background: '#000' }}
          />

          <div
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
              padding: '2.5rem 1.25rem 0.75rem',
              pointerEvents: 'auto'
            }}
            role="toolbar"
            aria-label="TV Controls"
          >
            <button
              onClick={() => { const iframe = document.getElementById('video-frame'); if (iframe) iframe.contentWindow?.focus(); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { document.getElementById('video-frame')?.contentWindow?.focus(); e.preventDefault(); } }}
              tabIndex={0}
              style={{
                padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '0.85rem'
              }}
            >
              ▶ Play
            </button>

            <button
              onClick={toggleFullscreen}
              onKeyDown={(e) => { if (e.key === 'Enter') { toggleFullscreen(); e.preventDefault(); } }}
              tabIndex={0}
              style={{
                padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '6px', color: 'white', cursor: 'pointer', fontSize: '0.85rem'
              }}
            >
              {isFullscreen ? '⛶ Exit' : '⛶ Fullscreen'}
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {currentSource.id}
          </span>
          {inWatchlist ? (
            <button onClick={toggleWatchlist} style={{ padding: '0.5rem 1rem', background: 'var(--primary)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer' }} tabIndex={0}>
              ✓ In Watchlist
            </button>
          ) : (
            <button onClick={toggleWatchlist} style={{ padding: '0.5rem 1rem', background: 'var(--surface)', border: '2px solid var(--border)', borderRadius: '8px', color: 'var(--text)', cursor: 'pointer' }} tabIndex={0}>
              + Add to Watchlist
            </button>
          )}
        </div>

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
