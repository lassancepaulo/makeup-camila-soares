const http = require('http');
const fs = require('fs');
const path = require('path');
const root = __dirname;
const PORT = process.env.PORT || 3300;
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

http.createServer((req, res) => {
  let urlPath = req.url === '/' ? '/index.html' : req.url;
  urlPath = urlPath.split('?')[0];
  const fp = path.join(root, urlPath);
  if (!fs.existsSync(fp)) {
    res.writeHead(404);
    return res.end('Not found');
  }
  const ext = path.extname(fp);
  res.writeHead(200, { 'Content-Type': mime[ext] || 'text/plain' });
  fs.createReadStream(fp).pipe(res);
}).listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://0.0.0.0:${PORT}`);
});
