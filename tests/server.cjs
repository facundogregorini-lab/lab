// Local server that mimics Vercel: serves index.html and runs api/*.js with an in-memory database.
// Usage: npm run dev  →  http://127.0.0.1:3000
const http = require('node:http'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
process.env.MANUELITA_MEMORY_DB ??= '1';

function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const match = /^\/api\/([a-z]+)$/.exec(url.pathname);
    if (!match) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(fs.readFileSync(path.join(root, 'index.html')));
    }
    const file = path.join(root, 'api', match[1] + '.js');
    if (!fs.existsSync(file)) { res.statusCode = 404; return res.end('{}'); }
    let raw = '';
    for await (const chunk of req) raw += chunk;
    try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = raw; }
    res.status = code => { res.statusCode = code; return res; };
    res.json = data => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(data)); return res; };
    await require(file)(req, res);
  });
}

module.exports = { createServer };
if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createServer().listen(port, '127.0.0.1', () => console.log('Manuelita en http://127.0.0.1:' + port));
}
