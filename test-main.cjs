const http = require('http');
http.get('http://localhost:3000/src/main.tsx', res => {
  let b = '';
  console.log("STATUS:", res.statusCode);
  res.on('data', d => b += d);
  res.on('end', () => console.log('BODY:', b.slice(0, 500)));
});
