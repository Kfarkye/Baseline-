const http = require('http');

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/ai-status',
  method: 'GET'
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', body));
});

req.on('error', e => console.error(e));
req.end();
