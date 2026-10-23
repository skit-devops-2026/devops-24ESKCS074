const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const server = require('../server');

let port;

test.before(() => new Promise((resolve) => {
  server.listen(0, '127.0.0.1', () => {
    port = server.address().port;
    resolve();
  });
}));

test.after(() => new Promise((resolve) => server.close(resolve)));

function request(path) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}${path}`, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({
        status: res.statusCode,
        type: res.headers['content-type'],
        body
      }));
    });
    req.on('error', reject);
  });
}

test('homepage is served successfully', async () => {
  const response = await request('/');
  assert.equal(response.status, 200);
  assert.match(response.type, /text\/html/);
  assert.match(response.body, /PetPal/);
});

test('stylesheet is served successfully', async () => {
  const response = await request('/css/style.css');
  assert.equal(response.status, 200);
  assert.match(response.type, /text\/css/);
});

test('missing file returns 404', async () => {
  const response = await request('/does-not-exist.html');
  assert.equal(response.status, 404);
});
