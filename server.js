const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.TMDB_API_KEY;
const API_BASE = 'https://api.themoviedb.org/3';

console.log('PORT:', PORT);
console.log('API_KEY set:', !!API_KEY);

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');

  console.log('Request:', req.method, req.url);

  if (req.url === '/api/health' || req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok',
      apiKeySet: !!API_KEY,
      apiKeyPrefix: API_KEY ? API_KEY.substring(0, 8) : null
    }));
    return;
  }

  if (req.url === '/api/trending' || req.url.startsWith('/api/trending')) {
    console.log('Handling trending request');
    if (!API_KEY) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'TMDB_API_KEY not configured' }));
      return;
    }
    const url = `${API_BASE}/trending/all/week?language=en-US&api_key=${API_KEY}`;
    console.log('Fetching TMDB:', url.replace(API_KEY, 'HIDDEN'));
    proxyRequest(url, res);
    return;
  }

  if (req.url.startsWith('/api/search')) {
    console.log('Handling search request');
    if (!API_KEY) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'TMDB_API_KEY not configured' }));
      return;
    }
    const query = req.url.split('?')[1];
    const url = `${API_BASE}/search/multi?language=en-US&${query}&api_key=${API_KEY}`;
    console.log('Searching TMDB:', url.replace(API_KEY, 'HIDDEN'));
    proxyRequest(url, res);
    return;
  }

  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, filePath);

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'text/plain';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        fs.readFile(path.join(__dirname, 'index.html'), (err, content) => {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content);
        });
      } else {
        res.writeHead(500);
        res.end('Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

const https = require('https');

function proxyRequest(url, res) {
  console.log('Proxying to:', url.replace(API_KEY, 'HIDDEN'));
  
  const request = https.get(url, (proxyRes) => {
    let data = '';
    proxyRes.on('data', chunk => data += chunk);
    proxyRes.on('end', () => {
      console.log('TMDB response status:', proxyRes.statusCode);
      res.writeHead(proxyRes.statusCode, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(data);
    });
  });
  
  request.on('error', (err) => {
    console.error('Proxy error:', err.message);
    res.writeHead(502);
    res.end(JSON.stringify({ error: 'Bad Gateway', details: err.message }));
  });
  
  request.setTimeout(10000, () => {
    console.error('Request timeout');
    request.destroy();
    res.writeHead(504);
    res.end(JSON.stringify({ error: 'Timeout' }));
  });
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});