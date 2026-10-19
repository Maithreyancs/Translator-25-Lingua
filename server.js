/**
 * LinguaVoice - Standalone Offline Server & Ollama Bridge
 * Zero-dependency Node.js HTTP server.
 * - Serves all static frontend assets.
 * - Bridges requests to local Ollama (127.0.0.1:11434) with CORS handling.
 * - Provides live Ollama health checks & model listing.
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

const DEFAULT_PORT = 3000;
const OLLAMA_HOST = '127.0.0.1';
const OLLAMA_PORT = 11434;

// TTS offline cache directory
const TTS_CACHE_DIR = path.join(__dirname, '.cache', 'tts');
if (!fs.existsSync(TTS_CACHE_DIR)) {
    try {
        fs.mkdirSync(TTS_CACHE_DIR, { recursive: true });
    } catch (e) {}
}

const MIME_TYPES = {
    '.html': 'text/html; charset=UTF-8',
    '.js': 'application/javascript; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.json': 'application/json; charset=UTF-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=UTF-8'
};

function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/**
 * Check if Ollama is running and list installed models
 */
function checkOllamaHealth() {
    return new Promise((resolve) => {
        const req = http.request({
            host: OLLAMA_HOST,
            port: OLLAMA_PORT,
            path: '/api/tags',
            method: 'GET',
            timeout: 2500
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ running: true, models: parsed.models || [] });
                } catch (e) {
                    resolve({ running: true, models: [] });
                }
            });
        });

        req.on('error', (err) => {
            resolve({ running: false, error: err.message, models: [] });
        });

        req.on('timeout', () => {
            req.destroy();
            resolve({ running: false, error: 'Ollama connection timed out', models: [] });
        });

        req.end();
    });
}

/**
 * Proxy request directly to Ollama
 */
function proxyToOllama(req, res, targetPath) {
    const headers = { ...req.headers, host: `${OLLAMA_HOST}:${OLLAMA_PORT}` };
    const options = {
        host: OLLAMA_HOST,
        port: OLLAMA_PORT,
        path: targetPath,
        method: req.method,
        headers: headers
    };

    const proxyReq = http.request(options, (proxyRes) => {
        setCorsHeaders(res);
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
        setCorsHeaders(res);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: `Failed to connect to Ollama at ${OLLAMA_HOST}:${OLLAMA_PORT}. Ensure Ollama is running with 'ollama serve'.`,
            details: err.message
        }));
    });

    req.pipe(proxyReq);
}

/**
 * Handle TTS proxy and offline cache
 */
function handleTTS(req, res, parsedUrl) {
    const q = parsedUrl.searchParams.get('q') || '';
    const tl = parsedUrl.searchParams.get('tl') || 'en';

    if (!q) {
        setCorsHeaders(res);
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing parameter: q');
        return;
    }

    const hash = crypto.createHash('md5').update(`${tl}_${q}`).digest('hex');
    const cachedFile = path.join(TTS_CACHE_DIR, `${hash}.mp3`);

    // If already cached locally, serve immediately (100% offline ready)
    if (fs.existsSync(cachedFile)) {
        setCorsHeaders(res);
        res.writeHead(200, {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'public, max-age=86400',
            'X-TTS-Cache': 'HIT'
        });
        fs.createReadStream(cachedFile).pipe(res);
        return;
    }

    // Request from Google TTS with clean User-Agent and NO referer header
    const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(tl)}&client=tw-ob&q=${encodeURIComponent(q)}`;
    const googleReq = https.get(googleUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*'
        },
        timeout: 5000
    }, (googleRes) => {
        if (googleRes.statusCode !== 200) {
            setCorsHeaders(res);
            res.writeHead(googleRes.statusCode, { 'Content-Type': 'text/plain' });
            res.end(`TTS status: ${googleRes.statusCode}`);
            return;
        }

        setCorsHeaders(res);
        res.writeHead(200, {
            'Content-Type': 'audio/mpeg',
            'Cache-Control': 'public, max-age=86400',
            'X-TTS-Cache': 'MISS'
        });

        const fileStream = fs.createWriteStream(cachedFile);
        googleRes.pipe(fileStream);
        googleRes.pipe(res);
    });

    googleReq.on('error', (err) => {
        setCorsHeaders(res);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'TTS request error', details: err.message }));
    });

    googleReq.on('timeout', () => {
        googleReq.destroy();
        setCorsHeaders(res);
        res.writeHead(504, { 'Content-Type': 'text/plain' });
        res.end('TTS timed out');
    });
}

/**
 * Serve static files from workspace root
 */
function serveStaticFile(req, res, pathname) {
    let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
    filePath = path.normalize(filePath);

    // Prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        res.end('403 Forbidden');
        return;
    }

    fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
            // Check if it's an html page without extension
            if (fs.existsSync(filePath + '.html')) {
                filePath = filePath + '.html';
            } else {
                res.writeHead(404, { 'Content-Type': 'text/html; charset=UTF-8' });
                res.end(`<h1>404 Not Found</h1><p>The file ${pathname} was not found.</p><p><a href="/">Return to LinguaVoice Studio</a></p>`);
                return;
            }
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': 'no-cache'
        });

        const stream = fs.createReadStream(filePath);
        stream.pipe(res);
    });
}

const server = http.createServer(async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        res.writeHead(204);
        res.end();
        return;
    }

    const host = req.headers.host || `localhost:${DEFAULT_PORT}`;
    const parsedUrl = new URL(req.url, `http://${host}`);
    const pathname = parsedUrl.pathname;

    // --- API: Ollama Status ---
    if (pathname === '/api/ollama/status' || pathname === '/api/ollama-status') {
        setCorsHeaders(res);
        const health = await checkOllamaHealth();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(health));
        return;
    }

    // --- API: Text-to-Speech Proxy & Offline Caching (/api/tts) ---
    if (pathname === '/api/tts') {
        handleTTS(req, res, parsedUrl);
        return;
    }

    // --- API: Ollama Proxy (/api/ollama/*) ---
    if (pathname.startsWith('/api/ollama/')) {
        const ollamaSubPath = pathname.replace(/^\/api\/ollama/, '/api');
        proxyToOllama(req, res, ollamaSubPath);
        return;
    }

    // --- Static Files ---
    serveStaticFile(req, res, pathname);
});

function startServer(port) {
    server.listen(port, () => {
        console.log('====================================================');
        console.log('  🌐 LinguaVoice 25-Lingua Offline Studio');
        console.log(`  🚀 Local URL:  http://localhost:${port}`);
        console.log(`  🤖 Ollama Bridge: http://localhost:${port}/api/ollama`);
        console.log('====================================================');

        checkOllamaHealth().then(health => {
            if (health.running) {
                console.log(`  ✅ Ollama connected! Detected ${health.models.length} model(s):`);
                health.models.forEach(m => console.log(`     - ${m.name} (${(m.size / (1024 * 1024 * 1024)).toFixed(2)} GB)`));
            } else {
                console.log('  ⚠️  Ollama not detected at 127.0.0.1:11434.');
                console.log('     Run "ollama serve" to enable Offline LLM translation.');
            }
            console.log('====================================================\n');
        });
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`Port ${port} in use, trying port ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error('Server error:', err);
        }
    });
}

startServer(DEFAULT_PORT);
