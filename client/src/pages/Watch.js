import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

export default function Watch() {
  const { type, id } = useParams();
  const { currentProfile } = useProfile();
  const [media, setMedia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [showSources, setShowSources] = useState(false);

  const VIDKING_EMBED = `https://www.vidking.net/embed/${type}/${id}`;

  const loadMedia = useCallback(async () => {
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
    const iframe = document.getElementById('vidking-frame');
    if (!iframe) return;

    const blockAds = () => {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          const style = iframeDoc.createElement('style');
          style.textContent = `
            .vidking-ads, .ad-container, .ad-overlay, [class*="ads"], [id*="ads"], 
            .video-ads, .preroll-ad, [class*="advertisement"], .splash-ad, 
            .overlay-ad, .companion-ads, .ima-container {
              display: none !important;
              visibility: hidden !important;
              opacity: 0 !important;
              pointer-events: none !important;
              height: 0 !important;
              width: 0 !important;
              overflow: hidden !important;
            }
            .preroll-skip, .ad-skip-button, [class*="skip-ad"] {
              display: none !important;
            }
          `;
          iframeDoc.head.appendChild(style);

          const ads = iframeDoc.querySelectorAll('.vidking-ads, .ad-container, [class*="ads"], [id*="ads"], .preroll-ad, .splash-ad');
          ads.forEach(ad => {
            ad.style.display = 'none';
            ad.remove();
          });
        }
      } catch (e) {
        // Cross-origin restrictions prevent direct access
      }
    };

    const interval = setInterval(blockAds, 1000);
    iframe.addEventListener('load', blockAds);

    return () => {
      clearInterval(interval);
      iframe.removeEventListener('load', blockAds);
    };
  }, []);

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
        <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          ← Back to Home
        </Link>
        
        <div className="watch-container">
          <iframe
            id="vidking-frame"
            src={VIDKING_EMBED}
            frameBorder="0"
            allowFullScreen
            allow="autoplay; fullscreen"
            scrolling="no"
            title="Video Player"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: '#000'
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Powered by Vidking</span>
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