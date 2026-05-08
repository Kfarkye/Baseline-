const http = require('http');
http.get('http://localhost:3000', res => {
  let b = '';
  res.on('data', d => b += d);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', b.slice(0, 500)));
});
