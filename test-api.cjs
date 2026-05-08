const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/gemini/insights',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', body));
});

req.on('error', e => console.error(e));
req.write(JSON.stringify({ contents: [{role: 'user', parts: [{text: 'test'}]}], dynamicContext: '', mode: 'auto' }));
req.end();
