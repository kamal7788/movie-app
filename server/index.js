require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');

const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profiles');
const watchlistRoutes = require('./routes/watchlist');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/watchlist', watchlistRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/trending', (req, res) => {
  if (!process.env.TMDB_API_KEY) {
    return res.status(500).json({ error: 'TMDB_API_KEY not configured' });
  }
  const url = `https://api.themoviedb.org/3/trending/all/week?language=en-US&api_key=${process.env.TMDB_API_KEY}`;
  proxyRequest(url, res);
});

app.get('/api/search', (req, res) => {
  if (!process.env.TMDB_API_KEY) {
    return res.status(500).json({ error: 'TMDB_API_KEY not configured' });
  }
  const query = req.url.split('?')[1];
  const url = `https://api.themoviedb.org/3/search/multi?language=en-US&${query}&api_key=${process.env.TMDB_API_KEY}`;
  proxyRequest(url, res);
});

app.get('/api/movie/:id', (req, res) => {
  if (!process.env.TMDB_API_KEY) {
    return res.status(500).json({ error: 'TMDB_API_KEY not configured' });
  }
  const url = `https://api.themoviedb.org/3/movie/${req.params.id}?api_key=${process.env.TMDB_API_KEY}&language=en-US`;
  proxyRequest(url, res);
});

app.get('/api/tv/:id', (req, res) => {
  if (!process.env.TMDB_API_KEY) {
    return res.status(500).json({ error: 'TMDB_API_KEY not configured' });
  }
  const url = `https://api.themoviedb.org/3/tv/${req.params.id}?api_key=${process.env.TMDB_API_KEY}&language=en-US`;
  proxyRequest(url, res);
});

app.get('/api/discover', (req, res) => {
  if (!process.env.TMDB_API_KEY) {
    return res.status(500).json({ error: 'TMDB_API_KEY not configured' });
  }
  const { genre, source, sort_by } = req.query;
  let url = `https://api.themoviedb.org/3/discover/movie?api_key=${process.env.TMDB_API_KEY}&language=en-US&sort_by=${sort_by || 'popularity.desc'}`;
  if (genre) url += `&with_genres=${genre}`;
  if (source) {
    const networks = { 'netflix': 213, 'disney+': 337, 'hbo': 49, 'hulu': 453, 'amazon': 1024, 'apple-tv': 2552 };
    if (networks[source]) url += `&with_networks=${networks[source]}`;
  }
  proxyRequest(url, res);
});

app.get('/api/genres', (req, res) => {
  if (!process.env.TMDB_API_KEY) {
    return res.status(500).json({ error: 'TMDB_API_KEY not configured' });
  }
  const url = `https://api.themoviedb.org/3/genre/movie/list?api_key=${process.env.TMDB_API_KEY}&language=en-US`;
  proxyRequest(url, res);
});

function proxyRequest(apiUrl, res) {
  https.get(apiUrl, (proxyRes) => {
    let data = '';
    proxyRes.on('data', chunk => data += chunk);
    proxyRes.on('end', () => {
      res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
      res.end(data);
    });
  }).on('error', (err) => {
    res.writeHead(502);
    res.end(JSON.stringify({ error: 'Bad Gateway', details: err.message }));
  });
}

const clientBuildPath = path.join(__dirname, 'client', 'build');
const fs = require('fs');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));