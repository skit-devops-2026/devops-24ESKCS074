// Simple zero-dependency HTTP server for PetPal
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const BASE_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const reqPath = req.url.split('?')[0];

  // Health check endpoint
  if (reqPath === '/health') {
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8'
    });
    res.end(JSON.stringify({ status: 'healthy' }));
    return;
  }

  // Prometheus metrics endpoint
  if (reqPath === '/metrics') {
    res.writeHead(200, {
      'Content-Type': 'text/plain; version=0.0.4; charset=utf-8'
    });
    res.end(
      '# HELP petpal_up Whether the PetPal server is running\n' +
      '# TYPE petpal_up gauge\n' +
      'petpal_up 1\n'
    );
    return;
  }

  // Serve the homepage
  let fileReqPath = reqPath;
if (reqPath === '/') {
  fileReqPath = '/index.html';
}

  const filePath = path.join(BASE_DIR, fileReqPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType =
    MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, {
          'Content-Type': 'text/plain; charset=utf-8'
        });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, {
          'Content-Type': 'text/plain; charset=utf-8'
        });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType
      });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(
    `🐾 PetPal is running locally at: http://localhost:${PORT}`
  );
  console.log(`Press Ctrl+C in terminal to stop.`);
});