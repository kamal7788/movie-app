import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactPlayer from 'react-player';
import { useProfile } from '../context/ProfileContext';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const SOURCES = [
  { id: 'embed.su', name: 'Server 1', url: (type, id, s, e) => type === 'tv' ? `https://embed.su/embed/tv/${id}/${s}/${e}` : `https://embed.su/embed/movie/${id}` },
  { id: 'vidsrc.net', name: 'Server 2', url: (type, id, s, e) => type === 'tv' ? `https://vidsrc.net/embed/tv/${id}/${s}/${e}` : `https://vidsrc.net/embed/movie/${id}` },
  { id: 'vidking', name: 'Server 3', url: (type, id) => `https://www.vidking.net/embed/${type}/${id}` },
];

export default function Watch() {
  const { type, id } = useParams();
  const { currentProfile } = useProfile();
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [currentSource, setCurrentSource] = useState('api');
  const [videoUrl, setVideoUrl] = useState(null);
  const [useEmbed, setUseEmbed] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [apiError, setApiError] = useState(false);
  const containerRef = useRef(null);
  const hideTimerRef = useRef(null);

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

  const fetchVideoSource = useCallback(async () => {
    setApiError(false);
    setUseEmbed(false);
    setVideoUrl(null);
    try {
      const res = await fetch(`/api/source/${type}/${id}`);
      if (!res.ok) throw new Error('No source found');
      const data = await res.json();
      if (data.url) {
        setVideoUrl(data.url);
        return;
      }
    } catch (err) {
      console.error('API source failed:', err);
    }
    setApiError(true);
  }, [type, id]);

  useEffect(() => {
    fetchVideoSource();
  }, [fetchVideoSource]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowControls(false), 4000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, [currentSource, resetHideTimer]);

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await el.requestFullscreen();
    }
  };

  const togglePlayPause = () => setPlaying(p => !p);

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

  const switchToEmbed = (sourceId) => {
    setCurrentSource(sourceId);
    setUseEmbed(true);
    setVideoUrl(null);
  };

  const switchToApi = () => {
    setCurrentSource('api');
    setUseEmbed(false);
    setVideoUrl(null);
    setApiError(false);
    fetchVideoSource();
  };

  const embedUrl = () => {
    const source = SOURCES.find(s => s.id === currentSource);
    if (!source) return '';
    return source.url(type, id, 1, 1);
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
            <button onClick={switchToApi} style={{
              padding: '0.3rem 0.6rem',
              background: currentSource === 'api' && !useEmbed ? 'var(--primary)' : 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text)',
              cursor: 'pointer',
              fontSize: '0.75rem'
            }} tabIndex={0}>Direct</button>
            {SOURCES.map(source => (
              <button key={source.id} onClick={() => switchToEmbed(source.id)} style={{
                padding: '0.3rem 0.6rem',
                background: currentSource === source.id && useEmbed ? 'var(--primary)' : 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text)',
                cursor: 'pointer',
                fontSize: '0.75rem'
              }} tabIndex={0}>{source.name}</button>
            ))}
          </div>
        </div>

        <div
          ref={containerRef}
          className="watch-container"
          style={{ position: 'relative', background: '#000', cursor: showControls ? 'default' : 'none' }}
          onMouseMove={resetHideTimer}
          onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { togglePlayPause(); e.preventDefault(); } }}
          tabIndex={-1}
        >
          {useEmbed ? (
            <iframe
              src={embedUrl()}
              frameBorder="0"
              allowFullScreen
              allow="autoplay; fullscreen"
              scrolling="no"
              title="Video Player"
              sandbox="allow-scripts allow-same-origin allow-forms allow-fullscreen"
              style={{ width: '100%', height: '100%', border: 'none', background: '#000' }}
            />
          ) : videoUrl ? (
            <ReactPlayer
              url={videoUrl}
              width="100%"
              height="100%"
              playing={playing}
              playsinline
              controls={false}
              onEnded={() => setPlaying(false)}
              onError={(e) => { console.error('ReactPlayer error:', e); setApiError(true); }}
              config={{
                file: {
                  attributes: { controlsList: 'nodownload' },
                  forceHLS: true,
                  forceVideo: true,
                }
              }}
              style={{ position: 'absolute', top: 0, left: 0 }}
            />
          ) : apiError ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', flexDirection: 'column', gap: '1rem', padding: '2rem' }}>
              <p style={{ fontSize: '1.1rem' }}>Direct play unavailable</p>
              <p style={{ fontSize: '0.9rem', textAlign: 'center' }}>Try one of the embed servers above</p>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <div className="spinner"></div>
            </div>
          )}

          {!useEmbed && videoUrl && showControls && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2rem',
                background: 'rgba(0,0,0,0.25)',
                transition: 'opacity 0.3s',
                opacity: showControls ? 1 : 0,
                pointerEvents: showControls ? 'auto' : 'none'
              }}
              onMouseMove={resetHideTimer}
              tabIndex={0}
              role="group"
              aria-label="Video controls"
            >
              <button
                onClick={togglePlayPause}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { togglePlayPause(); e.preventDefault(); } }}
                tabIndex={0}
                style={{
                  width: '80px', height: '80px', borderRadius: '50%',
                  background: 'rgba(229, 9, 20, 0.9)',
                  border: '3px solid rgba(255,255,255,0.3)',
                  color: 'white', fontSize: '2.5rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s', outline: 'none'
                }}
                aria-label={playing ? 'Pause' : 'Play'}
              >
                {playing ? '⏸' : '▶'}
              </button>

              <button
                onClick={toggleFullscreen}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { toggleFullscreen(); e.preventDefault(); } }}
                tabIndex={0}
                style={{
                  width: '60px', height: '60px', borderRadius: '50%',
                  background: 'rgba(255,255,255,0.15)',
                  border: '2px solid rgba(255,255,255,0.3)',
                  color: 'white', fontSize: '1.5rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backdropFilter: 'blur(4px)', outline: 'none'
                }}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                ⛶
              </button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {useEmbed ? `${currentSource.toUpperCase()} Embed` : 'Direct Stream'}
          </div>
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
