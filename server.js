const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const url = require('url');

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.TMDB_API_KEY;
const API_BASE = 'https://api.themoviedb.org/3';

const SUPER_SECRET_PASS = process.env.SUPER_SECRET_PASS || '';
const SECRET_KEY = process.env.SECRET_KEY || '';
const EPORNER_BASE = 'https://eporner.com/api/v2';

console.log('PORT:', PORT);
console.log('TMDB_API_KEY set:', !!API_KEY);
console.log('SUPER_SECRET_PASS set:', !!SUPER_SECRET_PASS);
console.log('SECRET_KEY set:', !!SECRET_KEY);

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
      superSecretSet: !!SUPER_SECRET_PASS,
      secretKeySet: !!SECRET_KEY
    }));
    return;
  }

  if (req.url === '/api/trending' || req.url.startsWith('/api/trending')) {
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
    if (!API_KEY) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'TMDB_API_KEY not configured' }));
      return;
    }
    const query = req.url.split('?')[1];
    const apiUrl = `${API_BASE}/search/multi?language=en-US&${query}&api_key=${API_KEY}`;
    console.log('Searching TMDB:', apiUrl.replace(API_KEY, 'HIDDEN'));
    proxyRequest(apiUrl, res);
    return;
  }

  if (req.url.startsWith('/api/admin/login')) {
    const body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
      const data = JSON.parse(Buffer.concat(body).toString());
      const password = data.password;
      const isValid = password === SUPER_SECRET_PASS || (SECRET_KEY && password === SECRET_KEY);
      if (isValid) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ authenticated: true }));
      } else {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid password' }));
      }
    });
    return;
  }

  if (req.url.startsWith('/api/admin/search')) {
    const authHeader = req.headers['authorization'];
    const isAuthorized = authHeader === SUPER_SECRET_PASS || (SECRET_KEY && authHeader === SECRET_KEY);
    if (!isAuthorized) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
    const urlObj = new url.URL(req.url, 'http://localhost');
    const query = urlObj.searchParams.get('q') || 'all';
    const page = urlObj.searchParams.get('page') || '1';
    const order = urlObj.searchParams.get('order') || 'most-popular';
    const epornerUrl = `${EPORNER_BASE}/video/search/?query=${encodeURIComponent(query)}&per_page=30&page=${page}&thumbsize=big&order=${order}&format=json`;
    proxyEpornerRequest(epornerUrl, res);
    return;
  }

if (req.url.startsWith('/api/admin/video')) {
    const authHeader = req.headers['authorization'];
    const isAuthorized = authHeader === SUPER_SECRET_PASS || (SECRET_KEY && authHeader === SECRET_KEY);
    if (!isAuthorized) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
    const urlObj = new url.URL(req.url, 'http://localhost');
    const videoId = urlObj.searchParams.get('id');
    if (!videoId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Video ID required' }));
      return;
    }
    const epornerUrl = `${EPORNER_BASE}/video/id/?id=${videoId}&thumbsize=big&format=json`;
    proxyEpornerRequest(epornerUrl, res);
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

function proxyRequest(apiUrl, res) {
  console.log('Proxying to:', apiUrl.replace(API_KEY, 'HIDDEN'));
  
  const request = https.get(apiUrl, (proxyRes) => {
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

function proxyEpornerRequest(apiUrl, res) {
  console.log('Proxying to Eporner:', apiUrl);
  
  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Referer': 'https://eporner.com/'
    }
  };
  
  const doRequest = (finalUrl) => {
    console.log('Making request to:', finalUrl);
    
    https.get(finalUrl, options, (proxyRes) => {
      console.log('Response status:', proxyRes.statusCode);
      console.log('Response headers:', JSON.stringify(proxyRes.headers));
      
      if (proxyRes.statusCode === 301 || proxyRes.statusCode === 302) {
        const redirectUrl = proxyRes.headers.location;
        console.log('Got redirect to:', redirectUrl);
        if (redirectUrl) {
          doRequest(redirectUrl.startsWith('http') ? redirectUrl : 'https://eporner.com' + redirectUrl);
          return;
        }
      }
      
      let data = '';
      proxyRes.on('data', chunk => data += chunk);
      proxyRes.on('end', () => {
        console.log('Final response length:', data.length);
        res.writeHead(proxyRes.statusCode, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(data);
      });
    }).on('error', (err) => {
      console.error('Request error:', err.message);
      res.writeHead(502);
      res.end(JSON.stringify({ error: 'Proxy error', details: err.message }));
    });
  };
  
  doRequest(apiUrl);
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});