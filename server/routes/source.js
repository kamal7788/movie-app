const express = require('express');
const https = require('https');
const http = require('http');

const router = express.Router();

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const fetcher = url.startsWith('https') ? https : http;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    fetcher.get(url, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://embed.su/',
      }
    }, (res) => {
      clearTimeout(timeout);
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

function extractJsonFromScript(html, pattern) {
  const match = html.match(pattern);
  if (match) {
    try { return JSON.parse(match[1]); } catch(e) {}
  }
  return null;
}

// Try to get direct video URL from embed.su
async function getFromEmbedSu(type, id, season, episode) {
  const url = type === 'tv' 
    ? `https://embed.su/embed/tv/${id}/${season}/${episode}`
    : `https://embed.su/embed/movie/${id}`;
  
  const html = await fetchUrl(url);
  
  let sources = extractJsonFromScript(html, /sources:\s*(\[[\s\S]*?\])\s*\},?\s*(?:tracks|player)/);
  if (!sources) {
    sources = extractJsonFromScript(html, /"sources"\s*:\s*(\[[\s\S]*?\])\s*,/);
  }
  if (!sources) {
    sources = extractJsonFromScript(html, /file:\s*"([^"]+\.(?:m3u8|mp4)[^"]*)"/);
    if (sources) return [{ file: sources }];
  }
  
  if (Array.isArray(sources) && sources.length > 0) {
    return sources.map(s => s.file || s.src || s).filter(Boolean);
  }
  return [];
}

// Try vidsrc.net (cleaner than vidsrc.cc)
async function getFromVidsrcNet(type, id, season, episode) {
  const url = type === 'tv'
    ? `https://vidsrc.net/embed/tv/${id}/${season}/${episode}`
    : `https://vidsrc.net/embed/movie/${id}`;
  
  const html = await fetchUrl(url);
  const match = html.match(/source\s+src=["']([^"']+)["']/);
  if (match) return [match[1]];
  
  const hlsMatch = html.match(/(https?:[^"'\s]+\.m3u8[^"'\s]*)/);
  if (hlsMatch) return [hlsMatch[1]];
  
  return [];
}

// Try direct TMDB-based sources
async function getFromTmdbSource(type, id, season, episode) {
  const url = type === 'tv'
    ? `https://vidsrc.cc/v2/api/tv/${id}/${season}/${episode}/en`
    : `https://vidsrc.cc/v2/api/movie/${id}/en`;
  
  try {
    const data = await fetchUrl(url);
    const parsed = JSON.parse(data);
    if (parsed?.result?.sources) {
      return parsed.result.sources.map(s => s.url || s).filter(Boolean);
    }
  } catch(e) {}
  return [];
}

// GET /api/source/:type/:id
router.get('/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  const season = req.query.season || 1;
  const episode = req.query.episode || 1;
  
  const validTypes = ['movie', 'tv'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ error: 'Invalid type. Use "movie" or "tv"' });
  }

  const providers = [
    { name: 'embed.su', fn: () => getFromEmbedSu(type, id, season, episode) },
    { name: 'vidsrc.net', fn: () => getFromVidsrcNet(type, id, season, episode) },
    { name: 'tmdb', fn: () => getFromTmdbSource(type, id, season, episode) },
  ];

  for (const provider of providers) {
    try {
      const urls = await provider.fn();
      if (urls.length > 0) {
        return res.json({ 
          source: provider.name, 
          url: urls[0],
          urls,
          type: type,
          id: id,
          season: type === 'tv' ? Number(season) : undefined,
          episode: type === 'tv' ? Number(episode) : undefined
        });
      }
    } catch (err) {
      console.log(`Source ${provider.name} failed:`, err.message);
    }
  }

  res.status(404).json({ error: 'No video source found' });
});

module.exports = router;
