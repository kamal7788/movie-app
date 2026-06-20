const express = require('express');
require('dotenv').config();

const router = express.Router();
const TMDB_BASE = 'https://api.themoviedb.org/3';

async function tmdbFetch(path, params = {}) {
  const url = new URL(`${TMDB_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });

  const res = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${process.env.TMDB_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    throw new Error(`TMDB ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// Trending
router.get('/trending/:mediaType/:timeWindow', async (req, res) => {
  try {
    const data = await tmdbFetch(`/trending/${req.params.mediaType}/${req.params.timeWindow}`, req.query);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Discover
router.get('/discover/:mediaType', async (req, res) => {
  try {
    const data = await tmdbFetch(`/discover/${req.params.mediaType}`, req.query);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Search
router.get('/search/:mediaType', async (req, res) => {
  try {
    const endpoint = req.params.mediaType === 'multi' ? '/search/multi' : `/search/${req.params.mediaType}`;
    const data = await tmdbFetch(endpoint, req.query);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Details
router.get('/:mediaType/:id', async (req, res) => {
  try {
    const data = await tmdbFetch(`/${req.params.mediaType}/${req.params.id}`, req.query);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Genres
router.get('/genre/:mediaType/list', async (req, res) => {
  try {
    const data = await tmdbFetch(`/genre/${req.params.mediaType}/list`, req.query);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Watch Providers (for streaming service filters)
router.get('/watch/providers/:mediaType', async (req, res) => {
  try {
    const data = await tmdbFetch(`/watch/providers/${req.params.mediaType}`, req.query);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// TV Season / Episode
router.get('/tv/:id/season/:season', async (req, res) => {
  try {
    const data = await tmdbFetch(`/tv/${req.params.id}/season/${req.params.season}`, req.query);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Now playing / Upcoming / Popular / Top Rated
router.get('/:mediaType/:category', async (req, res) => {
  try {
    const data = await tmdbFetch(`/${req.params.mediaType}/${req.params.category}`, req.query);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
